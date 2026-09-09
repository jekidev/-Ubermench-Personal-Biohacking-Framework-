#[tauri::command]
pub async fn fetch_url_text(url: String) -> Result<String, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|error| format!("Request failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("HTTP {} for {}", response.status(), url));
    }
    response
        .text()
        .await
        .map_err(|error| format!("Failed to read body: {error}"))
}
