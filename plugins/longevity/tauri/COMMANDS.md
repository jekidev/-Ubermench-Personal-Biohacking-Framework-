# Longevity Tauri Command Contract v0.2

The native shell now implements the first PDF text-extraction command. Renderer code must continue to use opaque tokens and must never receive arbitrary filesystem write access.

## `extract_pdf_lab_text`

Input:

```json
{
  "data": "PDF bytes"
}
```

In the TypeScript adapter this is a `Uint8Array`; Tauri serializes the byte payload for the command boundary.

Output:

```json
{
  "method": "native-text",
  "pages": [
    { "page_number": 1, "text": "..." }
  ],
  "warnings": []
}
```

The current native implementation uses `pdf-extract` for text-based PDFs. It does **not** claim to OCR scanned/image-only PDFs. Those return an empty-text warning so the UI can route them to an explicit OCR-capable runtime later.

## PDF safety rules

- Reject empty input.
- Reject input without a `%PDF-` header.
- Reject PDFs larger than 50 MiB at this command boundary.
- Never log PDF contents, DNA, or health values.
- Extraction output is a candidate only and must remain review-first.
- Page boundaries are marked as inferred when the extractor does not expose explicit page separators.

## Existing file commands

`longevity_pick_file`, `longevity_read_file`, `longevity_store_source`, and `longevity_delete_source` remain the file lifecycle boundary. The renderer still uses opaque file tokens and application-controlled storage.
