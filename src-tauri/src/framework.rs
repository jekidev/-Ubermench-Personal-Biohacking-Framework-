use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Serialize)]
pub struct FileHit {
    pub path: String,
    pub preview: String,
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn safe_relative_path(relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if path.is_absolute() {
        return Err("unsafe path: absolute paths are not allowed".into());
    }
    if path
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err("unsafe path: parent traversal is not allowed".into());
    }
    Ok(repo_root().join(path))
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
    let root = repo_root();
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
    let root = repo_root();
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
                    let lower = text.to_lowercase();
                    if let Some(index) = lower.find(needle) {
                        let start = index.saturating_sub(160);
                        let end = (index + needle.len() + 300).min(text.len());
                        hits.push(FileHit {
                            path: rel,
                            preview: text[start..end].replace('\n', " "),
                        });
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
        .current_dir(repo_root())
        .output()
        .map_err(|error| error.to_string())?;
    let mut combined = String::from_utf8_lossy(&output.stdout).to_string();
    combined.push_str(&String::from_utf8_lossy(&output.stderr));
    combined.truncate(combined.len().min(120_000));
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
}
