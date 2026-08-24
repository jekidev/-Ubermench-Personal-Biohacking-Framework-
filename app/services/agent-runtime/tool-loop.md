# Agent tool execution

The runtime separates planning from execution. Model planning never receives native execution privileges.

Flow:

1. `AgentTask` is evaluated by governance.
2. A tool call is bounded by the runtime tool loop.
3. Low-risk local tools can execute through `AgentToolGateway`.
4. Approval-required tools require an explicit `approvalToken`.
5. `mcp.stdio` delegates to the Tauri native command, which validates the executable, exact arguments, token expiry and single-use semantics.
6. Tool results become `AgentObservation` entries.
7. `continueAgentWithTools()` sends only verified observations back to the LLM for continuation.

The runtime never fabricates a native approval token. Token issuance remains a separate explicit UI/native action.
