# Connectors (Cursor-style integrations)

Unified registry for external services, modeled after Cursor MCP plugins.

## Architecture

```text
CONNECTOR_REGISTRY (plugins/connectors/registry.ts)
  ↓
connector-store (enabled/disabled in localStorage)
  ↓
Google OAuth PKCE (one client, Drive + Gmail + Calendar)
  ↓
MCP_SERVER_REGISTRY + local install store (mcp.install)
  ↓
Agent tools: connector.* | calendar.* | gmail.* | drive.* | mcp.*
```

## Live vs scaffold

| Connector | Status | What's wired |
|-----------|--------|--------------|
| Gmail, Drive, Calendar | live | Shared Google OAuth PKCE, adapters, agent tools |
| Discord | live | MCP stdio + agent tool |
| Hugging Face | live | Inference engine + MCP registry entry |
| GitHub, Slack, Tavily, Context7, Notion, filesystem, memory, fetch | catalog | Install via `mcp.install`; secrets stay in vault |
| Sentry, Stripe, Supabase, Convex, Vercel | planned | Registry metadata only |

## Agent tools

- `connector.list` / `connector.status` / `connector.catalog` / `connector.google.status`
- `calendar.list` / `calendar.create` / `calendar.suggest`
- `gmail.search` / `gmail.draft` / `gmail.send` (send = high-risk approval)
- `drive.search` / `drive.sync` / `connector.drive.sync`
- `mcp.catalog` / `mcp.status` / `mcp.install` / `mcp.uninstall`

Install persists command, args, and env *key names* only. Custom servers require `userConfirmed: true`.
