# Longevity PDF extraction

The PDF pipeline is deliberately split into two layers:

1. **Native extractor** — Tauri/Rust obtains trustworthy PDF text/layout or OCR output and returns page/locator provenance.
2. **Longevity parser** — platform-independent TypeScript converts extracted text into biomarker candidates, reference intervals and warnings.

```text
PDF
 ↓
Tauri `extract_pdf_lab_text`
 ↓
page text + spans + method
 ↓
Longevity extraction engine
 ↓
biomarker candidates
 ↓
confidence + warnings + provenance
 ↓
editable review
 ↓
explicit confirmation
 ↓
append-only store
```

## Native command contract

`extract_pdf_lab_text` accepts an opaque `sourcePathToken` only. It must not accept arbitrary renderer filesystem paths.

The command should return:

- page number
- extracted text
- optional text spans with coordinates
- extraction method (`native-text` or `ocr`)
- warnings

OCR is an explicit runtime capability. It is never silently substituted by the renderer.

## Safety

A PDF extraction result is an observation candidate, not a confirmed medical value. The parser must retain provenance and confidence and require user review before persistence.