use serde::Serialize;

const MAX_PDF_BYTES: usize = 50 * 1024 * 1024;

#[derive(Debug, Serialize, Clone)]
pub struct PdfPageText {
    pub page_number: u32,
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct PdfTextExtraction {
    pub method: String,
    pub pages: Vec<PdfPageText>,
    pub warnings: Vec<String>,
}

fn normalize_text(input: &str) -> String {
    input
        .replace('\u{0000}', "")
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .trim()
        .to_owned()
}

fn split_pages(text: &str) -> (Vec<PdfPageText>, Vec<String>) {
    let mut warnings = Vec::new();
    let chunks: Vec<&str> = text.split('\u{000C}').collect();

    let pages = if chunks.len() > 1 {
        chunks
            .iter()
            .enumerate()
            .map(|(index, chunk)| PdfPageText {
                page_number: (index + 1) as u32,
                text: normalize_text(chunk),
            })
            .filter(|page| !page.text.is_empty())
            .collect()
    } else if !text.trim().is_empty() {
        warnings.push("PDF extractor did not expose page boundaries; all text is attributed to page 1".to_owned());
        vec![PdfPageText {
            page_number: 1,
            text: normalize_text(text),
        }]
    } else {
        Vec::new()
    };

    (pages, warnings)
}

#[tauri::command]
pub fn extract_pdf_lab_text(data: Vec<u8>) -> Result<PdfTextExtraction, String> {
    if data.is_empty() {
        return Err("PDF input is empty".to_owned());
    }
    if data.len() > MAX_PDF_BYTES {
        return Err(format!("PDF exceeds the {} MiB safety limit", MAX_PDF_BYTES / 1024 / 1024));
    }
    if !data.starts_with(b"%PDF-") {
        return Err("Input does not have a valid PDF header".to_owned());
    }

    let extraction = pdf_extract::extract_text_from_mem(&data)
        .map_err(|error| format!("Native PDF text extraction failed: {error:?}"))?;

    let (pages, mut warnings) = split_pages(&extraction);
    if pages.is_empty() {
        warnings.push("No text was extracted. An OCR-capable runtime is required for scanned/image-only PDFs".to_owned());
    }

    Ok(PdfTextExtraction {
        method: "native-text".to_owned(),
        pages,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::{normalize_text, split_pages};

    #[test]
    fn normalizes_line_endings_and_nulls() {
        assert_eq!(normalize_text("A\r\nB\u{0000}\rC"), "A\nB\nC");
    }

    #[test]
    fn splits_form_feed_pages() {
        let (pages, warnings) = split_pages("A\u{000C}B");
        assert!(warnings.is_empty());
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].page_number, 1);
        assert_eq!(pages[1].page_number, 2);
    }

    #[test]
    fn flags_missing_page_boundaries() {
        let (pages, warnings) = split_pages("A\nB");
        assert_eq!(pages.len(), 1);
        assert_eq!(pages[0].page_number, 1);
        assert_eq!(warnings.len(), 1);
    }
}
