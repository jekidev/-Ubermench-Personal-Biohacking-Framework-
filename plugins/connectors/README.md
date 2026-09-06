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

## Tauri Tesseract OCR (live)

Desktop command `ocr_pdf_bytes` invokes system Tesseract on PDF bytes.
Wired to `/longevity/bloods` via `TauriOcrAdapter` when "Local OCR fallback" is enabled.

## Still missing vs Cursor

1. Full MCP protocol client (tool discovery, SSE/HTTP)
2. Connector marketplace / dynamic install
3. Per-connector scoped permissions
4. Vector embeddings for RAG
