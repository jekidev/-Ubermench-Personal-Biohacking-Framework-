# Connectors (Cursor-style integrations)

Unified registry for external services, modeled after Cursor MCP plugins.

## Architecture

```text
CONNECTOR_REGISTRY (plugins/connectors/registry.ts)
  ↓
connector-store (enabled/disabled in localStorage)
  ↓
connector-runtime (credential check via secret vault)
  ↓
MCP_SERVER_REGISTRY (stdio spawn for live connectors)
  ↓
Agent tools: connector.list | connector.status | connector.catalog
              mcp.stdio:<serverId>
```

## Live vs scaffold

| Connector | Status | What's wired |
|-----------|--------|--------------|
| Discord | live | MCP stdio + agent tool |
| Hugging Face | live | Inference engine + MCP registry entry |
| GitHub, Slack, Tavily, Context7 | scaffold | MCP registry + vault keys; needs credentials |
| Gmail, Google Drive, Calendar | scaffold | OAuth UI not built; manual token storage only |
| Notion, Sentry, Stripe, Supabase, Convex, Vercel | planned | Registry metadata only |

## Missing vs Cursor

1. OAuth redirect flows (Gmail, Drive, Calendar)
2. Full MCP protocol client (tool discovery, SSE/HTTP transport)
3. Connector marketplace / dynamic install
4. Per-connector scoped permissions
5. Google Drive → RAG sync adapter
6. OAuth token refresh
7. Connector health dashboard (only LLM provider health exists today)

## Adding a connector

1. Add entry to `plugins/connectors/registry.ts`
2. If MCP-based, add to `plugins/llm/mcp/servers.ts`
3. Store credentials via secret vault (`pages/connectors.vue` or Settings)
4. Optional: add domain-specific adapter under `plugins/connectors/adapters/`
