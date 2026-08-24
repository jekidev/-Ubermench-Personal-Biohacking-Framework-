# Tauri integration boundary

The Longevity plugin owns the import/domain contracts. The Tauri shell owns privileged filesystem access.

## Required native commands

Recommended Tauri commands for the application shell:

- `pick_health_file` — open a native picker with PDF/CSV/TSV/JSON/VCF filters.
- `persist_health_source` — write the original source file into the app's private data directory using the supplied SHA-256 fingerprint.
- `read_health_source` — read a previously imported source document by document id.
- `delete_health_source` — explicit user-requested deletion of a source file and its metadata.

## Boundary

```text
Nuxt component
  ↓
NativeFileAdapter
  ↓
Tauri invoke()
  ↓
Rust command
  ↓
private app data directory
```

The frontend never constructs arbitrary filesystem paths. The Rust command validates filenames, restricts storage to the application data directory and returns an opaque local document reference.

## Import confirmation

The native picker only selects a source. Persistence must occur after the UI preview is confirmed.

## Privacy

Health and genetic source documents are private application data by default. Do not log raw DNA, report contents, or absolute filesystem paths.
