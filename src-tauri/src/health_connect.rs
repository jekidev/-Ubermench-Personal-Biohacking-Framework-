use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthConnectPermissionStatus {
    pub available: bool,
    pub installed: bool,
    pub granted: Vec<String>,
    pub missing: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthConnectSamplePayload {
    pub id: String,
    pub metric: String,
    pub value: f64,
    pub unit: String,
    pub recorded_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthConnectSyncResult {
    pub samples: Vec<HealthConnectSamplePayload>,
    pub cursor: Option<String>,
    pub warnings: Vec<String>,
}

fn desktop_unavailable() -> String {
    "Health Connect requires the Ubermench Android app (Tauri Android build). Browser/PWA cannot access Health Connect.".into()
}

#[tauri::command]
pub fn health_connect_is_available() -> Result<HealthConnectPermissionStatus, String> {
    Ok(HealthConnectPermissionStatus {
        available: false,
        installed: false,
        granted: Vec::new(),
        missing: vec![
            "steps".into(),
            "heart-rate".into(),
            "sleep".into(),
            "hrv".into(),
        ],
    })
}

#[tauri::command]
pub fn health_connect_get_permission_status() -> Result<HealthConnectPermissionStatus, String> {
    Err(desktop_unavailable())
}

#[tauri::command]
pub fn health_connect_request_permissions() -> Result<HealthConnectPermissionStatus, String> {
    Err(desktop_unavailable())
}

#[tauri::command]
pub fn health_connect_sync_records(
    _from: Option<String>,
    _to: Option<String>,
) -> Result<HealthConnectSyncResult, String> {
    Err(desktop_unavailable())
}
