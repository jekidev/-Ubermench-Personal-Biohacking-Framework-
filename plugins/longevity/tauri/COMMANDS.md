# Longevity Tauri Command Contract v0.1

The repository does not currently contain a `src-tauri` shell, so this document defines the stable native boundary that the future Tauri app must implement.

## Commands

### `longevity_pick_file`

Request a native file picker.

Input:

```json
{
  "acceptedKinds": ["blood_report", "dna_raw", "dna_report"],
  "extensions": ["pdf", "csv", "tsv", "json", "vcf"]
}
```

Output:

```json
{
  "pathToken": "opaque-native-token",
  "filename": "report.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 12345
}
```

The path itself must not be exposed to untrusted web content.

### `longevity_read_file`

Input: opaque `pathToken`.

Output: bytes + metadata needed by the local import service.

The command must reject paths outside the selected file and application-controlled temporary area.

### `longevity_store_source`

Input: source document metadata + bytes.

Behavior:

- calculate SHA-256
- store in application-private data directory
- return source document ID
- reject duplicate fingerprint unless explicitly requested as a re-import

### `longevity_delete_source`

Delete a source document and associated derived data only after explicit user confirmation. Deletion must be auditable in the local event log.

## Security boundary

- Do not accept arbitrary filesystem paths from Nuxt.
- Do not log file contents, raw DNA, or health values.
- Do not expose private app-data paths to the renderer.
- Use opaque IDs/tokens between the renderer and native layer.
- All writes are local unless a future feature explicitly opts into remote sync.

## Adapter shape

```ts
export interface LongevityNativeFileAdapter {
  pickFile(request: FilePickRequest): Promise<PickedFile>
  readFile(pathToken: string): Promise<Uint8Array>
  storeSource(input: StoreSourceInput): Promise<StoredSource>
  deleteSource(sourceId: string): Promise<void>
}
```

The browser implementation may use a development fallback; production Tauri implements the same interface with native commands.
