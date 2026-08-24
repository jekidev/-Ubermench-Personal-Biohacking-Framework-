# PDF laboratory import contract v0.1

PDF reports are treated as source documents first and clinical data second.

## Pipeline

```text
PDF file
  -> local checksum
  -> text/layout extraction
  -> laboratory/date detection
  -> biomarker candidate detection
  -> unit/reference-range normalization
  -> confidence + warnings
  -> human preview
  -> explicit confirmation
  -> append-only measurement events
```

## Required behavior

- Preserve the original PDF locally.
- Never overwrite a previously imported report.
- Store SHA-256 fingerprint for duplicate detection.
- Preserve source page/line information where available.
- Never silently convert an ambiguous unit.
- Preserve the laboratory's original reference interval.
- Mark OCR-derived values with lower confidence than native text extraction.
- Require explicit user confirmation before saving parsed values.
- Parsed values must remain traceable to the source document.

## Fallback

If extraction is incomplete, the UI must show the report as **needs review** and allow manual correction rather than guessing.
