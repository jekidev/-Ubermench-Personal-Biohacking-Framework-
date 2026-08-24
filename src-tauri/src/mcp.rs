use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    io::{Read, Write},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

const DEFAULT_TIMEOUT_MS: u64 = 15_000;
const MAX_OUTPUT_BYTES: usize = 2 * 1024 * 1024;
const MAX_STDIN_BYTES: usize = 1024 * 1024;
const MAX_ARGS: usize = 64;
const MAX_ARG_BYTES: usize = 8 * 1024;
const APPROVAL_TTL_MS: u64 = 30_000;

#[derive(Debug, Deserialize)]
pub struct McpStdioRequest { pub command: String, pub args: Vec<String>, pub approval_token: String, pub timeout_ms: Option<u64> }
#[derive(Debug, Serialize)]
pub struct McpStdioPreflight { pub transport: &'static str, pub command: String, pub args: Vec<String>, pub timeout_ms: u64 }
#[derive(Debug, Serialize)]
pub struct McpStdioResult { pub stdout: String, pub stderr: String, pub exit_code: Option<i32>, pub timed_out: bool }
#[derive(Debug, Deserialize)]
pub struct McpStdioApprovalRequest { pub command: String, pub args: Vec<String> }
#[derive(Debug, Serialize)]
pub struct McpApproval { pub token: String, pub expires_in_ms: u64 }
#[derive(Debug, Default)]
pub struct McpApprovalRegistry { pub(crate) tokens: Mutex<HashMap<String, ApprovalRecord>> }
#[derive(Debug)]
pub(crate) struct ApprovalRecord { fingerprint: String, expires_at_ms: u64 }

fn now_ms() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 }
fn fingerprint(command: &str, args: &[String]) -> String { let mut hasher = Sha256::new(); hasher.update(command.as_bytes()); hasher.update([0u8]); for arg in args { hasher.update(arg.as_bytes()); hasher.update([0u8]); } format!("{:x}", hasher.finalize()) }
fn allowlisted_command(command: &str) -> bool { matches!(command, "node" | "nodejs" | "npx" | "bun" | "deno" | "python" | "python3") }
fn validate_args(args: &[String]) -> Result<(), String> { if args.len() > MAX_ARGS { return Err(format!("MCP stdio blocked: too many arguments (max {MAX_ARGS}).")); } if args.iter().any(|arg| arg.len() > MAX_ARG_BYTES) { return Err(format!("MCP stdio blocked: an argument exceeds the {MAX_ARG_BYTES}-byte limit.")); } Ok(()) }
fn validate_command(command: &str) -> Result<(), String> { if command.trim().is_empty() { return Err("MCP stdio blocked: command is required.".into()); } if command.contains('/') || command.contains('\\') { return Err("MCP stdio blocked: executable paths are not permitted; use an allowlisted executable name.".into()); } if !allowlisted_command(command) { return Err("MCP stdio blocked: executable is not allowlisted.".into()); } Ok(()) }
fn timeout_ms(value: Option<u64>) -> u64 { value.unwrap_or(DEFAULT_TIMEOUT_MS).clamp(250, 60_000) }

#[tauri::command]
pub fn mcp_stdio_preflight(request: McpStdioRequest) -> Result<McpStdioPreflight, String> { validate_command(&request.command)?; validate_args(&request.args)?; Ok(McpStdioPreflight { transport: "stdio", command: request.command, args: request.args, timeout_ms: timeout_ms(request.timeout_ms) }) }

#[tauri::command]
pub fn mcp_issue_approval(request: McpStdioApprovalRequest, registry: tauri::State<'_, McpApprovalRegistry>) -> Result<McpApproval, String> {
    validate_command(&request.command)?; validate_args(&request.args)?; let fingerprint = fingerprint(&request.command, &request.args); let now = now_ms(); let count = registry.tokens.lock().map_err(|_| "MCP approval registry poisoned.")?.len(); let seed = format!("{}:{}:{}", fingerprint, now, count); let mut hasher = Sha256::new(); hasher.update(seed.as_bytes()); let token = format!("mcp-{:x}", hasher.finalize()); let expires_at_ms = now.saturating_add(APPROVAL_TTL_MS);
    registry.tokens.lock().map_err(|_| "MCP approval registry poisoned.")?.insert(token.clone(), ApprovalRecord { fingerprint, expires_at_ms }); Ok(McpApproval { token, expires_in_ms: APPROVAL_TTL_MS })
}

fn consume_approval(registry: &McpApprovalRegistry, token: &str, command: &str, args: &[String]) -> Result<(), String> {
    if token.trim().is_empty() { return Err("MCP stdio blocked: explicit approval is required.".into()); } validate_command(command)?; validate_args(args)?; let mut tokens = registry.tokens.lock().map_err(|_| "MCP approval registry poisoned.")?; let record = tokens.remove(token).ok_or_else(|| "MCP stdio blocked: approval is missing, expired, or already used.".to_string())?; if record.expires_at_ms < now_ms() { return Err("MCP stdio blocked: approval expired.".into()); } if record.fingerprint != fingerprint(command, args) { return Err("MCP stdio blocked: approved command/arguments do not match execution.".into()); } Ok(())
}
fn collect_output(mut reader: impl Read + Send + 'static) -> thread::JoinHandle<Vec<u8>> { thread::spawn(move || { let mut buf = Vec::new(); let mut chunk = [0u8; 8192]; while buf.len() < MAX_OUTPUT_BYTES { match reader.read(&mut chunk) { Ok(0) => break, Ok(n) => buf.extend_from_slice(&chunk[..n.min(MAX_OUTPUT_BYTES - buf.len())]), Err(_) => break } } buf }) }
fn terminate(child: &mut Child) { let _ = child.kill(); let _ = child.wait(); }

#[tauri::command]
pub fn mcp_stdio_execute(request: McpStdioRequest, stdin_payload: String, registry: tauri::State<'_, McpApprovalRegistry>) -> Result<McpStdioResult, String> {
    validate_command(&request.command)?; validate_args(&request.args)?; if stdin_payload.len() > MAX_STDIN_BYTES { return Err(format!("MCP stdio blocked: stdin payload exceeds the {MAX_STDIN_BYTES}-byte limit.")); } let timeout = timeout_ms(request.timeout_ms); consume_approval(&registry, &request.approval_token, &request.command, &request.args)?;
    let mut child = Command::new(&request.command).args(&request.args).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e| format!("MCP stdio spawn failed: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() { stdin.write_all(stdin_payload.as_bytes()).map_err(|e| format!("MCP stdio stdin failed: {e}"))?; }
    let stdout_reader = child.stdout.take().ok_or_else(|| "MCP stdio stdout unavailable.".to_string())?; let stderr_reader = child.stderr.take().ok_or_else(|| "MCP stdio stderr unavailable.".to_string())?; let stdout_handle = collect_output(stdout_reader); let stderr_handle = collect_output(stderr_reader); let deadline = Instant::now() + Duration::from_millis(timeout); let mut timed_out = false;
    loop { match child.try_wait().map_err(|e| format!("MCP stdio wait failed: {e}"))? { Some(_) => break, None if Instant::now() >= deadline => { timed_out = true; terminate(&mut child); break; }, None => thread::sleep(Duration::from_millis(25)) } }
    let exit_code = child.try_wait().ok().flatten().and_then(|status| status.code()); let stdout = String::from_utf8_lossy(&stdout_handle.join().unwrap_or_default()).into_owned(); let stderr = String::from_utf8_lossy(&stderr_handle.join().unwrap_or_default()).into_owned(); Ok(McpStdioResult { stdout, stderr, exit_code, timed_out })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn rejects_non_allowlisted_command() { assert!(validate_command("rm").is_err()); }
    #[test] fn rejects_path_based_command() { assert!(validate_command("/usr/bin/node").is_err()); }
    #[test] fn clamps_timeout() { assert_eq!(timeout_ms(Some(1)), 250); assert_eq!(timeout_ms(Some(100_000)), 60_000); }
    #[test] fn rejects_oversized_args() { assert!(validate_args(&["x".repeat(MAX_ARG_BYTES + 1)]).is_err()); }
    #[test] fn rejects_too_many_args() { assert!(validate_args(&["x".into(); MAX_ARGS + 1]).is_err()); }
    #[test] fn approval_is_single_use_and_exactly_bound() { let registry = McpApprovalRegistry::default(); let command = "node"; let args = vec!["server.js".to_string()]; let token = "token".to_string(); registry.tokens.lock().unwrap().insert(token.clone(), ApprovalRecord { fingerprint: fingerprint(command, &args), expires_at_ms: now_ms() + 10_000 }); assert!(consume_approval(&registry, &token, command, &args).is_ok()); assert!(consume_approval(&registry, &token, command, &args).is_err()); }
    #[test] fn rejects_exact_argument_mismatch() { let registry = McpApprovalRegistry::default(); let token = "token".to_string(); registry.tokens.lock().unwrap().insert(token.clone(), ApprovalRecord { fingerprint: fingerprint("node", &["safe.js".into()]), expires_at_ms: now_ms() + 10_000 }); assert!(consume_approval(&registry, &token, "node", &["other.js".into()]).is_err()); }
}
