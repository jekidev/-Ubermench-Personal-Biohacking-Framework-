use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrPageResult {
    pub page: u32,
    pub text: String,
    pub confidence: f32,
    pub engine: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrExtractionResult {
    pub pages: Vec<OcrPageResult>,
    pub engine: String,
    pub warnings: Vec<String>,
}

fn tesseract_available() -> bool {
    Command::new("tesseract")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn split_tesseract_pages(text: &str) -> Vec<(u32, String)> {
    let pages = text
        .split('\u{000C}')
        .map(str::trim)
        .filter(|page| !page.is_empty())
        .collect::<Vec<_>>();

    if pages.is_empty() {
        return Vec::new();
    }

    pages
        .iter()
        .enumerate()
        .map(|(index, page)| ((index + 1) as u32, page.to_string()))
        .collect()
}

fn run_tesseract_on_pdf(path: &Path) -> Result<String, String> {
    let output = Command::new("tesseract")
        .args([
            path.to_str().unwrap_or_default(),
            "stdout",
            "-l",
            "eng+dan",
            "--dpi",
            "300",
        ])
        .output()
        .map_err(|error| format!("Failed to invoke Tesseract OCR: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Tesseract OCR failed: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn ocr_pdf_path(path: &Path) -> Result<OcrExtractionResult, String> {
    if !tesseract_available() {
        return Err("Tesseract OCR is not installed or not on PATH.".into());
    }
    if !path.exists() {
        return Err("OCR source path does not exist.".into());
    }

    let text = run_tesseract_on_pdf(path)?;
    let pages = split_tesseract_pages(&text);
    let warnings = if pages.is_empty() {
        vec!["Tesseract returned no readable text.".into()]
    } else {
        vec!["OCR output requires manual review before clinical use.".into()]
    };

    Ok(OcrExtractionResult {
        engine: "tesseract".into(),
        warnings,
        pages: pages
            .into_iter()
            .map(|(page, text)| OcrPageResult {
                page,
                text,
                confidence: 0.72,
                engine: "tesseract".into(),
                warnings: vec!["OCR confidence is approximate; verify extracted values.".into()],
            })
            .collect(),
    })
}

#[tauri::command]
pub fn ocr_pdf_lab_text(source_path_token: String) -> Result<OcrExtractionResult, String> {
    ocr_pdf_path(Path::new(&source_path_token))
}

#[tauri::command]
pub fn ocr_pdf_bytes(pdf_bytes: Vec<u8>) -> Result<OcrExtractionResult, String> {
    let temp_path = std::env::temp_dir().join(format!(
        "ubermensch-ocr-{}.pdf",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or(0)
    ));
    fs::write(&temp_path, &pdf_bytes)
        .map_err(|error| format!("Failed to write temp PDF: {error}"))?;
    let result = ocr_pdf_path(&temp_path);
    let _ = fs::remove_file(&temp_path);
    result
}

#[tauri::command]
pub fn ocr_runtime_status() -> Result<bool, String> {
    Ok(tesseract_available())
}
