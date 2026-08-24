# Agent Runtime v2

The runtime composes the existing AgentKernel with the existing LLM orchestrator.

Flow:

1. Hydrate local memory.
2. Prepare task context and governance decision.
3. Route to the Kernel-selected model/provider when available.
4. Execute the bounded model call.
5. Record the observation and run metadata.
6. Persist memory and run history.
7. Propose, but do not automatically promote, evolved skills.
8. Expose runtime state through `useAgentRuntime()` and `/agent`.

Tool execution remains behind the AgentToolGateway and existing approval/security boundaries. Native Tauri/MCP execution can be attached to the gateway without bypassing those controls.
