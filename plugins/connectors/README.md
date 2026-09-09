# Connectors (Cursor-style integrations)

## Google OAuth (live)

PKCE browser flow on `/connectors`:

1. Save `GOOGLE_CLIENT_ID` (and optional client secret) in the vault
2. Add redirect URI `{origin}/connectors/oauth/callback` in Google Cloud Console
3. Connect Drive, Gmail, or both
4. Tokens stored as `GOOGLE_ACCESS_TOKEN`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_TOKEN_EXPIRES_AT`

## Google Drive → RAG (live)

`syncDrivePdfsToRag()` downloads new PDFs, extracts text, and indexes chunks.
Agent tool: `connector.drive.sync` (requires approval).

## YouTube / podcast → RAG (live)

`indexYouTubeUrlsToRag()` fetches YouTube captions (no API key), chunks transcript text, and stores it in the same local document RAG index used by `askWithDocuments()`.

- UI: `/connectors` → paste one or more YouTube URLs
- Tags: `youtube`, `podcast`, `biohacking`
- Desktop: Tauri command `fetch_url_text` avoids browser CORS limits
- Agent tool: `connector.youtube.index` (requires approval)

Videos must have captions/subtitles. For automation beyond single URLs:

| Need | Option |
| --- | --- |
| Playlists / channel search / no captions | `transcriptor` MCP (`get_playlist_transcripts`, `search_videos`, Whisper) |
| Logged-in / members-only videos | Transcriptor self-host with `COOKIES_FILE_PATH` (Netscape cookies export) |
| Subscription graph in vault | `EfficientStreet/youtube-subscriptions-ingest` (approved adapter candidate) |
| Hosted MCP (no Docker) | `https://transcriptor.gateway.mcpal.io/mcp` |

Enable Transcriptor on `/connectors`, then use `/youtube` in chat or `connector.youtube.index`.

## Tauri Tesseract OCR (live)

Desktop command `ocr_pdf_bytes` invokes system Tesseract on PDF bytes.
Wired to `/longevity/bloods` via `TauriOcrAdapter` when "Local OCR fallback" is enabled.

## Starred-repo integrations (approved)

These are thin adapters, not wholesale merges:

| Connector | Upstream | How it is used |
| --- | --- | --- |
| `paper-search` | openags/paper-search-mcp | MCP stdio literature search. Sci-Hub disabled. |
| `paper-qa` | Future-House/paper-qa | Optional local PDF RAG with citations. |
| `local-deep-research` | LearningCircuit/local-deep-research | Optional `ldr-mcp` sidecar. |
| `pdf-inspector` | firecrawl/pdf-inspector idea | In-process text-vs-scanned classifier for lab PDFs. |

Garmin-only biometric mapping from bio-vibing lives in `app/services/health-adapters/garmin-biometric-schema.ts`. Oura, Whoop, Apple Health, Fitbit and CGM providers stay rejected.

## Still missing vs Cursor

1. Full MCP protocol client (tool discovery, SSE/HTTP)
2. Connector marketplace / dynamic install
3. Per-connector scoped permissions
4. Vector embeddings for RAG
