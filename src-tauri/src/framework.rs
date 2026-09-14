use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct FileHit {
    pub path: String,
    pub preview: String,
}

static WORKSPACE: Mutex<Option<PathBuf>> = Mutex::new(None);

fn repo_root() -> Result<PathBuf, String> {
    WORKSPACE.lock().map_err(|_| "Workspace lock unavailable")?
        .clone().ok_or_else(|| "Select a framework workspace in Settings first.".into())
}

pub fn restore_workspace(app: &tauri::AppHandle) {
    let Ok(dir) = app.path().app_config_dir() else { return };
    let Ok(raw) = fs::read_to_string(dir.join("workspace.json")) else { return };
    let Ok(path) = serde_json::from_str::<PathBuf>(&raw) else { return };
    if let Ok(path) = path.canonicalize() {
        if path.is_dir() {
            if let Ok(mut workspace) = WORKSPACE.lock() { *workspace = Some(path); }
        }
    }
}

#[tauri::command]
pub fn framework_get_workspace() -> Result<Option<String>, String> {
    Ok(WORKSPACE.lock().map_err(|_| "Workspace lock unavailable")?
        .as_ref().map(|path| path.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn framework_set_workspace(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let root = PathBuf::from(path).canonicalize().map_err(|e| e.to_string())?;
    if !root.is_dir() { return Err("Workspace must be a directory".into()); }
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("workspace.json"), serde_json::to_vec(&root).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    *WORKSPACE.lock().map_err(|_| "Workspace lock unavailable")? = Some(root.clone());
    Ok(root.to_string_lossy().into_owned())
}

fn safe_relative_path_in(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if relative.is_empty() || path.is_absolute() || path.components().any(|part|
        matches!(part, Component::ParentDir | Component::RootDir | Component::Prefix(_))) {
        return Err("unsafe path: expected a relative workspace path".into());
    }
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    let mut target = root.clone();
    for part in path.components() {
        target.push(part);
        match fs::symlink_metadata(&target) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() {
                    return Err("unsafe path: symbolic links are not allowed".into());
                }
                if !target.canonicalize().map_err(|e| e.to_string())?.starts_with(&root) {
                    return Err("unsafe path: outside workspace".into());
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {},
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(target)
}

fn safe_relative_path(relative: &str) -> Result<PathBuf, String> {
    safe_relative_path_in(&repo_root()?, relative)
}

fn text_preview(text: &str, needle: &str) -> Option<String> {
    // Search and slice on the same UTF-8 string: case folding can change byte lengths.
    let lower = text.to_lowercase();
    let index = lower.find(needle)?;
    let mut start = index.saturating_sub(160);
    let mut end = (index + needle.len() + 300).min(lower.len());
    while !lower.is_char_boundary(start) { start -= 1; }
    while !lower.is_char_boundary(end) { end -= 1; }
    Some(lower[start..end].replace('\n', " "))
}

fn truncate_output(text: &mut String, max: usize) {
    let mut end = text.len().min(max);
    while !text.is_char_boundary(end) { end -= 1; }
    text.truncate(end);
}

fn ignored_path(rel: &str) -> bool {
    rel.starts_with(".git/")
        || rel.starts_with("node_modules/")
        || rel.starts_with(".nuxt/")
        || rel.starts_with(".output/")
        || rel.starts_with("src-tauri/target/")
}

fn walk_files(root: &Path, current: &Path, output: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(current) {
        for entry in entries.flatten() {
            let path = entry.path();
            if entry.file_type().map(|kind| kind.is_symlink()).unwrap_or(true) { continue; }
            let rel = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");
            if ignored_path(&rel) {
                continue;
            }
            if path.is_dir() {
                walk_files(root, &path, output);
            } else {
                output.push(rel);
            }
        }
    }
}

#[tauri::command]
pub fn framework_snapshot() -> Result<serde_json::Value, String> {
    let root = repo_root()?;
    let mut files = Vec::new();
    walk_files(&root, &root, &mut files);
    files.sort();
    Ok(serde_json::json!({
        "fileCount": files.len(),
        "files": files,
        "modules": ["longevity", "fearprime", "connectors", "llm", "agent-runtime"]
    }))
}

#[tauri::command]
pub fn framework_search(query: String, limit: usize) -> Result<Vec<FileHit>, String> {
    let root = repo_root()?;
    let needle = query.to_lowercase();
    let max = limit.clamp(1, 100);
    let mut hits = Vec::new();

    fn walk(root: &Path, current: &Path, needle: &str, max: usize, hits: &mut Vec<FileHit>) {
        if hits.len() >= max {
            return;
        }
        if let Ok(entries) = fs::read_dir(current) {
            for entry in entries.flatten() {
                if hits.len() >= max {
                    return;
                }
                let path = entry.path();
            if entry.file_type().map(|kind| kind.is_symlink()).unwrap_or(true) { continue; }
                let rel = path
                    .strip_prefix(root)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .replace('\\', "/");
                if ignored_path(&rel) {
                    continue;
                }
                if path.is_dir() {
                    walk(root, &path, needle, max, hits);
                    continue;
                }
                if let Ok(text) = fs::read_to_string(&path) {
                    if let Some(preview) = text_preview(&text, needle) {
                        hits.push(FileHit { path: rel, preview });
                    }
                }
            }
        }
    }

    walk(&root, &root, &needle, max, &mut hits);
    Ok(hits)
}

#[tauri::command]
pub fn framework_read_file(path: String, max_bytes: usize) -> Result<String, String> {
    let bytes = fs::read(safe_relative_path(&path)?).map_err(|error| error.to_string())?;
    let limit = max_bytes.clamp(1, 200_000);
    Ok(String::from_utf8_lossy(&bytes[..bytes.len().min(limit)]).to_string())
}

#[tauri::command]
pub fn framework_write_file(path: String, content: String) -> Result<(), String> {
    let target = safe_relative_path(&path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(target, content).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn framework_run_command(command: String, args: Vec<String>) -> Result<String, String> {
    let allowed = ["npm", "pnpm", "cargo", "bun"];
    if !allowed.contains(&command.as_str()) {
        return Err("command not allowlisted".into());
    }
    if args.len() > 32 {
        return Err("too many command arguments".into());
    }
    let output = std::process::Command::new(&command)
        .args(&args)
        .current_dir(repo_root()?)
        .output()
        .map_err(|error| error.to_string())?;
    let mut combined = String::from_utf8_lossy(&output.stdout).to_string();
    combined.push_str(&String::from_utf8_lossy(&output.stderr));
    truncate_output(&mut combined, 120_000);
    if !output.status.success() {
        return Err(format!("Command failed ({}): {combined}", output.status));
    }
    Ok(combined)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_parent_traversal() {
        assert!(safe_relative_path("../secrets.txt").is_err());
    }

    #[test]
    fn rejects_absolute_paths() {
        assert!(safe_relative_path("/etc/passwd").is_err());
    }

    #[test]
    fn rejects_disallowed_commands() {
        assert!(framework_run_command("rm".into(), vec!["-rf".into()]).is_err());
    }

    #[test]
    fn reads_known_repo_file() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
        let path = safe_relative_path_in(&root, "README.md").unwrap();
        assert!(fs::read_to_string(path).unwrap().contains("Ubermench"));
    }

    #[test]
    fn unicode_preview_and_output_are_safe() {
        let text = format!("{}İ😀æøå", "x".repeat(159));
        assert!(text_preview(&text, "i").is_some());
        let mut output = "æ😀ø".to_string();
        truncate_output(&mut output, 4);
        assert_eq!(output, "æ");
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_reads_and_new_children() {
        let root = std::env::temp_dir().join(format!("ubermench-path-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let link = root.join("outside");
        std::os::unix::fs::symlink(std::env::temp_dir(), &link).unwrap();
        assert!(safe_relative_path_in(&root, "outside/file.txt").is_err());
        fs::remove_file(link).unwrap();
        fs::remove_dir(root).unwrap();
    }
}
