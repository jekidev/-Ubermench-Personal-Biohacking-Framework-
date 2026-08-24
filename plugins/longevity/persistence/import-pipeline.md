# Local Import Pipeline

```text
Tauri/Nuxt file picker
        ↓
Source fingerprint (SHA-256)
        ↓
Format detection
        ↓
Local parser / OCR adapter
        ↓
Candidate observations / variants
        ↓
Validation + confidence + provenance
        ↓
Editable review
        ↓
Explicit user confirmation
        ↓
Append-only local store
        ↓
Longevity timeline + dashboard
```

## Persistence rules

- Source documents are local-only by default.
- The original source is never overwritten.
- SHA-256 fingerprints prevent duplicate document imports.
- Confirmed observations are append-only.
- A correction creates a new observation/version rather than silently mutating history.
- Low-confidence extraction cannot bypass review.
- Parsing and persistence are separate stages.
- No diagnosis or medication recommendation is produced by the import layer.

## Tauri integration boundary

The frontend should request a file through the Tauri/native file-picker adapter and pass the resulting bytes/metadata to the local import service. Browser storage is a development fallback; production should use the Tauri local persistence adapter when available.

## Privacy

No cloud upload is required for the core blood/DNA workflow. External evidence lookup, if added later, must be an explicit separate action and must not transmit raw DNA by default.
