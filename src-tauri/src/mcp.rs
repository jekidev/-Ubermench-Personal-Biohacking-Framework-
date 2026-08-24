use serde::{Deserialize, Serialize};
use std::{io::{Read, Write}, process::{Child, Command, Stdio}, thread, time::{Duration, Instant}};

const DEFAULT_TIMEOUT_MS: u64 = 15_000;
const MAX_OUTPUT_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Deserialize)]
pub struct McpStdioRequest {
    pub command: String,
    pub args: Vec<String>,
    pub approval_token: String,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct McpStdioPreflight {
    pub transport: &'static str,
    pub command: String,
    pub args: Vec<String>,
    pub timeout_ms: u64,
}

#[derive(Debug, Serialize)]
pub struct McpStdioResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub timed_out: bool,
}

fn allowlisted_command(command: &str) -> bool {
    matches!(command, "node" | "nodejs" | "npx" | "bun" | "deno" | "python" | "python3")
}

fn validate(request: &McpStdioRequest) -> Result<u64, String> {
    if request.approval_token.trim().is_empty() {
        return Err("MCP stdio blocked: explicit approval token required.".into());
    }
    if request.command.trim().is_empty() {
        return Err("MCP stdio blocked: command is required.".into());
    }
    if request.command.contains('/') || request.command.contains('\\') {
        return Err("MCP stdio blocked: executable paths are not permitted; use an allowlisted executable name.".into());
    }
    if !allowlisted_command(request.command.as_str()) {
        return Err("MCP stdio blocked: executable is not allowlisted.".into());
    }
    Ok(request.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS).clamp(250, 60_000))
}

#[tauri::command]
pub fn mcp_stdio_preflight(request: McpStdioRequest) -> Result<McpStdioPreflight, String> {
    let timeout_ms = validate(&request)?;
    Ok(McpStdioPreflight { transport: "stdio", command: request.command, args: request.args, timeout_ms })
}

fn collect_output(mut reader: impl Read + Send + 'static) -> thread::JoinHandle<Vec<u8>> {
    thread::spawn(move || {
        let mut buf = Vec::new();
        let mut chunk = [0u8; 8192];
        while buf.len() < MAX_OUTPUT_BYTES {
            match reader.read(&mut chunk) {
                Ok(0) => break,
                Ok(n) => buf.extend_from_slice(&chunk[..n.min(MAX_OUTPUT_BYTES - buf.len())]),
                Err(_) => break,
            }
        }
        buf
    })
}

fn terminate(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

#[tauri::command]
pub fn mcp_stdio_execute(request: McpStdioRequest, stdin_payload: String) -> Result<McpStdioResult, String> {
    let timeout_ms = validate(&request)?;

    let mut child = Command::new(&request.command)
        .args(&request.args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("MCP stdio spawn failed: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(stdin_payload.as_bytes()).map_err(|e| format!("MCP stdio stdin failed: {e}"))?;
    }

    let stdout_reader = child.stdout.take().ok_or_else(|| "MCP stdio stdout unavailable.".to_string())?;
    let stderr_reader = child.stderr.take().ok_or_else(|| "MCP stdio stderr unavailable.".to_string())?;
    let stdout_handle = collect_output(stdout_reader);
    let stderr_handle = collect_output(stderr_reader);
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    let mut timed_out = false;

    loop {
        match child.try_wait().map_err(|e| format!("MCP stdio wait failed: {e}"))? {
            Some(_) => break,
            None if Instant::now() >= deadline => {
                timed_out = true;
                terminate(&mut child);
                break;
            }
            None => thread::sleep(Duration::from_millis(25)),
        }
    }

    let exit_code = child.try_wait().ok().flatten().and_then(|status| status.code());
    let stdout = String::from_utf8_lossy(&stdout_handle.join().unwrap_or_default()).into_owned();
    let stderr = String::from_utf8_lossy(&stderr_handle.join().unwrap_or_default()).into_owned();
    Ok(McpStdioResult { stdout, stderr, exit_code, timed_out })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_approval() {
        let req = McpStdioRequest { command: "node".into(), args: vec![], approval_token: "".into(), timeout_ms: None };
        assert!(validate(&req).is_err());
    }

    #[test]
    fn rejects_non_allowlisted_command() {
        let req = McpStdioRequest { command: "rm".into(), args: vec!["-rf".into()], approval_token: "approved".into(), timeout_ms: None };
        assert!(validate(&req).is_err());
    }

    #[test]
    fn rejects_path_based_command() {
        let req = McpStdioRequest { command: "/usr/bin/node".into(), args: vec![], approval_token: "approved".into(), timeout_ms: None };
        assert!(validate(&req).is_err());
    }

    #[test]
    fn clamps_timeout() {
        let req = McpStdioRequest { command: "node".into(), args: vec![], approval_token: "approved".into(), timeout_ms: Some(1) };
        assert_eq!(validate(&req).unwrap(), 250);
    }
}
