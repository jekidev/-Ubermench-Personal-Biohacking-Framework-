# Native PDF extraction

The Tauri shell now performs the first native text-extraction stage for Longevity lab PDFs.

## Runtime behavior

- Text-based PDFs use the Rust `pdf-extract` engine.
- The command returns normalized page text and an explicit `native-text` method.
- If page separators are unavailable, the result is marked with a warning rather than pretending page provenance is exact.
- Scanned/image-only PDFs remain an explicit OCR requirement.
- The renderer still receives no arbitrary filesystem path.

## Pipeline

```text
Tauri file bytes
  ↓
extract_pdf_lab_text
  ↓
page text + method + warnings
  ↓
Longevity TypeScript lab parser
  ↓
biomarker candidates
  ↓
review/edit
  ↓
explicit confirmation
  ↓
append-only history
```
