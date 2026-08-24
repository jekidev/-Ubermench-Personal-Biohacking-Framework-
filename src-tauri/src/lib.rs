mod mcp;

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
        .manage(mcp::McpApprovalRegistry::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                let mut hasher = Sha256::new();
                hasher.update(password.as_bytes());
                hasher.finalize().to_vec()
            })
            .build(),
        )
        .invoke_handler(tauri::generate_handler![
            fingerprint_bytes,
            app_name,
            mcp::mcp_stdio_preflight,
            mcp::mcp_issue_approval,
            mcp::mcp_stdio_execute
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ubermench application");
}
