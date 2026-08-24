use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct McpStdioRequest {
    pub command: String,
    pub args: Vec<String>,
    pub approval_token: String,
}

#[derive(Debug, Serialize)]
pub struct McpStdioPreflight {
    pub transport: &'static str,
    pub command: String,
    pub args: Vec<String>,
}

/// Native-only preflight boundary. Actual process spawning must only be wired
/// after the frontend supplies an approval token produced by the human gate.
#[tauri::command]
pub fn mcp_stdio_preflight(request: McpStdioRequest) -> Result<McpStdioPreflight, String> {
    if request.approval_token.trim().is_empty() {
        return Err("MCP stdio blocked: explicit approval token required.".into());
    }
    if request.command.trim().is_empty() {
        return Err("MCP stdio blocked: command is required.".into());
    }
    Ok(McpStdioPreflight {
        transport: "stdio",
        command: request.command,
        args: request.args,
    })
}
