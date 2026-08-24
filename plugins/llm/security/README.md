# LLM security boundary

All LLM/MCP retrieval and side-effect actions are fail-closed and require an explicit human approval token before execution. Approval tokens are scoped to the exact action, target and payload and expire after a short TTL.

Future tool adapters must execute through the centralized tool execution gate. Direct provider/network/filesystem/process/storage calls from LLM tool handlers are prohibited unless they are reached through that gate.

Pure local reads may remain read-only, but web/network retrieval, scraping, RAG access, writes, deletes, sends, persistence and process execution require explicit approval. Destructive/data-changing operations also require the Tauri runtime.
