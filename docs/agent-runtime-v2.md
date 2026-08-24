# Agent Runtime v2

The agent runtime is a governed orchestration layer over the existing Uberm3nch LLM runtime and Tauri security boundary.

## Execution flow

1. Load runtime memory from the platform store.
2. Prepare the task through `AgentKernel` (governance, memory, skills, graph and model selection).
3. Abort when policy blocks the task or explicit confirmation is required.
4. Call the existing LLM orchestrator with the Kernel-selected provider/model as a preference.
5. Record the model result as an observation.
6. Persist the updated memory and run history.
7. Propose skill evolution candidates; do not auto-promote them.
8. Native MCP execution remains separately approval-bound and cannot be triggered by the generic agent loop without a human-issued native approval token.

## Persistence

- Browser: localStorage-backed `BrowserRuntimeStore`.
- Tauri: SQLite-backed `TauriRuntimeStore` using `@tauri-apps/plugin-sql`.

## Native MCP boundary

`native-mcp-tool.ts` is an adapter for the existing Tauri commands:

- `mcp_stdio_preflight`
- `mcp_issue_approval`
- `mcp_stdio_execute`

The native command itself performs executable allowlisting, exact argument binding, single-use approval consumption, bounded output collection and timeout enforcement.

## Safety invariant

The agent runtime may plan and request a tool action, but it must not mint its own native approval token. Native execution requires an explicit approval token produced by the Tauri approval command.
