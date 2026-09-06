use regex::Regex;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfTextSpan {
    pub page: u32,
    pub text: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfPage {
    pub page: u32,
    pub text: String,
    pub spans: Option<Vec<PdfTextSpan>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExtractionResult {
    pub source_path_token: String,
    pub pages: Vec<PdfPage>,
    pub method: String,
    pub warnings: Vec<String>,
}

fn decode_pdf_string(input: &str) -> String {
    let mut output = String::new();
    let mut chars = input.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\\' {
            match chars.next() {
                Some('n') => output.push('\n'),
                Some('r') => output.push('\r'),
                Some('t') => output.push('\t'),
                Some('(') => output.push('('),
                Some(')') => output.push(')'),
                Some(d) if d.is_ascii_digit() => {
                    let mut octal = String::from(d);
                    for _ in 0..2 {
                        if let Some(&next) = chars.peek() {
                            if next.is_ascii_digit() {
                                octal.push(next);
                                chars.next();
                            } else {
                                break;
                            }
                        }
                    }
                    if let Ok(code) = u32::from_str_radix(&octal, 8) {
                        if let Some(ascii) = char::from_u32(code) {
                            output.push(ascii);
                        }
                    }
                }
                Some(other) => output.push(other),
                None => {}
            }
        } else {
            output.push(ch);
        }
    }
    output
}

fn extract_text_from_pdf_bytes(bytes: &[u8]) -> Vec<(u32, String)> {
    let raw = String::from_utf8_lossy(bytes);
    let stream_re = Regex::new(r"stream\r?\n([\s\S]*?)\r?\nendstream").expect("valid regex");
    let paren_re = Regex::new(r"\(([^()\\]*)\)").expect("valid regex");

    let mut streams = Vec::new();
    for capture in stream_re.captures_iter(&raw) {
        let chunk = capture.get(1).map(|m| m.as_str()).unwrap_or_default();
        let decoded = paren_re
            .replace_all(chunk, "$1")
            .to_string()
            .replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace("\\t", "\t")
            .replace("\\(", "(")
            .replace("\\)", ")");
        let cleaned = decode_pdf_string(&decoded);
        if cleaned.trim().is_empty() {
            continue;
        }
        streams.push(cleaned);
    }

    let text = streams
        .join("\n")
        .chars()
        .filter(|ch| !ch.is_control() || *ch == '\n' || *ch == '\r' || *ch == '\t')
        .collect::<String>()
        .replace(" \n", "\n");

    if text.trim().is_empty() {
        return Vec::new();
    }

    let pages = text
        .split('\u{000C}')
        .map(str::trim)
        .filter(|page| !page.is_empty())
        .collect::<Vec<_>>();

    if pages.len() > 1 {
        return pages
            .iter()
            .enumerate()
            .map(|(index, page)| ((index + 1) as u32, page.to_string()))
            .collect();
    }

    vec![(1, text)]
}

#[tauri::command]
pub fn extract_pdf_lab_text(source_path_token: String) -> Result<PdfExtractionResult, String> {
    let path = Path::new(&source_path_token);
    if !path.exists() {
        return Err("PDF source path token does not resolve to an existing file.".into());
    }
    if path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.eq_ignore_ascii_case("pdf")) != Some(true) {
        return Err("Only PDF files are supported for lab extraction.".into());
    }

    let bytes = fs::read(path).map_err(|error| format!("Failed to read PDF: {error}"))?;
    let extracted = extract_text_from_pdf_bytes(&bytes);
    let warnings = if extracted.is_empty() {
        vec![
            "No readable text streams were found. OCR may be required for scanned PDFs.".into(),
        ]
    } else {
        Vec::new()
    };

    Ok(PdfExtractionResult {
        source_path_token,
        pages: extracted
            .into_iter()
            .map(|(page, text)| PdfPage {
                page,
                text,
                spans: None,
            })
            .collect(),
        method: "native-text".into(),
        warnings,
    })
}
