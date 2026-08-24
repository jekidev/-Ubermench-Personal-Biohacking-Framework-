use serde::Serialize;
use sha2::{Digest, Sha256};

#[derive(Debug, Serialize)]
pub struct SourceFingerprint {
    pub sha256: String,
    pub size_bytes: usize,
}

#[tauri::command]
fn fingerprint_bytes(data: Vec<u8>) -> SourceFingerprint {
    let mut hasher = Sha256::new();
    hasher.update(&data);
    SourceFingerprint {
        sha256: format!("{:x}", hasher.finalize()),
        size_bytes: data.len(),
    }
}

#[tauri::command]
fn app_name() -> &'static str {
    "Ubermench"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![fingerprint_bytes, app_name])
        .run(tauri::generate_context!())
        .expect("error while running Ubermench application");
}
