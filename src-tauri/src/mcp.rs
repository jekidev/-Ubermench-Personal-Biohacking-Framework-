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
const SESSION_IDLE_MS: u64 = 5 * 60 * 1000;
const SESSION_MAX_MS: u64 = 30 * 60 * 1000;
const MAX_SESSIONS: usize = 8;
const MAX_ENV_KEYS: usize = 16;
const MAX_ENV_VALUE_BYTES: usize = 4096;

#[derive(Debug, Deserialize)]
pub struct McpStdioRequest {
    pub command: String,
    pub args: Vec<String>,
    pub approval_token: String,
    pub timeout_ms: Option<u64>,
    pub env: Option<HashMap<String, String>>,
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
#[derive(Debug, Deserialize)]
pub struct McpStdioApprovalRequest {
    pub command: String,
    pub args: Vec<String>,
}
#[derive(Debug, Serialize)]
pub struct McpApproval {
    pub token: String,
    pub expires_in_ms: u64,
}
#[derive(Debug, Default)]
pub struct McpApprovalRegistry {
    pub(crate) tokens: Mutex<HashMap<String, ApprovalRecord>>,
}
#[derive(Debug)]
pub(crate) struct ApprovalRecord {
    fingerprint: String,
    expires_at_ms: u64,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn fingerprint(command: &str, args: &[String]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(command.as_bytes());
    hasher.update([0u8]);
    for arg in args {
        hasher.update(arg.as_bytes());
        hasher.update([0u8]);
    }
    format!("{:x}", hasher.finalize())
}
fn allowlisted_command(command: &str) -> bool {
    matches!(
        command,
        "node"
            | "nodejs"
            | "npx"
            | "bun"
            | "deno"
            | "python"
            | "python3"
            | "uvx"
            | "docker"
    )
}
fn validate_args(args: &[String]) -> Result<(), String> {
    if args.len() > MAX_ARGS {
        return Err(format!(
            "MCP stdio blocked: too many arguments (max {MAX_ARGS})."
        ));
    }
    if args.iter().any(|arg| arg.len() > MAX_ARG_BYTES) {
        return Err(format!(
            "MCP stdio blocked: an argument exceeds the {MAX_ARG_BYTES}-byte limit."
        ));
    }
    Ok(())
}
fn validate_env(env: &HashMap<String, String>) -> Result<(), String> {
    if env.len() > MAX_ENV_KEYS {
        return Err(format!(
            "MCP stdio blocked: too many environment variables (max {MAX_ENV_KEYS})."
        ));
    }
    for (key, value) in env {
        if key.trim().is_empty() || key.contains('=') {
            return Err("MCP stdio blocked: invalid environment variable key.".into());
        }
        if value.len() > MAX_ENV_VALUE_BYTES {
            return Err(format!(
                "MCP stdio blocked: environment variable {key} exceeds the {MAX_ENV_VALUE_BYTES}-byte limit."
            ));
        }
    }
    Ok(())
}
fn validate_command(command: &str) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("MCP stdio blocked: command is required.".into());
    }
    if command.contains('/') || command.contains('\\') {
        return Err("MCP stdio blocked: executable paths are not permitted; use an allowlisted executable name.".into());
    }
    if !allowlisted_command(command) {
        return Err("MCP stdio blocked: executable is not allowlisted.".into());
    }
    Ok(())
}
fn timeout_ms(value: Option<u64>) -> u64 {
    value.unwrap_or(DEFAULT_TIMEOUT_MS).clamp(250, 60_000)
}

#[tauri::command]
pub fn mcp_stdio_preflight(request: McpStdioRequest) -> Result<McpStdioPreflight, String> {
    validate_command(&request.command)?;
    validate_args(&request.args)?;
    Ok(McpStdioPreflight {
        transport: "stdio",
        command: request.command,
        args: request.args,
        timeout_ms: timeout_ms(request.timeout_ms),
    })
}

#[tauri::command]
pub fn mcp_issue_approval(
    request: McpStdioApprovalRequest,
    registry: tauri::State<'_, McpApprovalRegistry>,
) -> Result<McpApproval, String> {
    validate_command(&request.command)?;
    validate_args(&request.args)?;
    let fingerprint = fingerprint(&request.command, &request.args);
    let now = now_ms();
    let count = registry
        .tokens
        .lock()
        .map_err(|_| "MCP approval registry poisoned.")?
        .len();
    let seed = format!("{}:{}:{}", fingerprint, now, count);
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    let token = format!("mcp-{:x}", hasher.finalize());
    let expires_at_ms = now.saturating_add(APPROVAL_TTL_MS);
    registry
        .tokens
        .lock()
        .map_err(|_| "MCP approval registry poisoned.")?
        .insert(
            token.clone(),
            ApprovalRecord {
                fingerprint,
                expires_at_ms,
            },
        );
    Ok(McpApproval {
        token,
        expires_in_ms: APPROVAL_TTL_MS,
    })
}

fn consume_approval(
    registry: &McpApprovalRegistry,
    token: &str,
    command: &str,
    args: &[String],
) -> Result<(), String> {
    if token.trim().is_empty() {
        return Err("MCP stdio blocked: explicit approval is required.".into());
    }
    validate_command(command)?;
    validate_args(args)?;
    let mut tokens = registry
        .tokens
        .lock()
        .map_err(|_| "MCP approval registry poisoned.")?;
    let record = tokens.remove(token).ok_or_else(|| {
        "MCP stdio blocked: approval is missing, expired, or already used.".to_string()
    })?;
    if record.expires_at_ms < now_ms() {
        return Err("MCP stdio blocked: approval expired.".into());
    }
    if record.fingerprint != fingerprint(command, args) {
        return Err("MCP stdio blocked: approved command/arguments do not match execution.".into());
    }
    Ok(())
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
pub fn mcp_stdio_execute(
    request: McpStdioRequest,
    stdin_payload: String,
    registry: tauri::State<'_, McpApprovalRegistry>,
) -> Result<McpStdioResult, String> {
    validate_command(&request.command)?;
    validate_args(&request.args)?;
    if stdin_payload.len() > MAX_STDIN_BYTES {
        return Err(format!(
            "MCP stdio blocked: stdin payload exceeds the {MAX_STDIN_BYTES}-byte limit."
        ));
    }
    let timeout = timeout_ms(request.timeout_ms);
    consume_approval(
        &registry,
        &request.approval_token,
        &request.command,
        &request.args,
    )?;
    if let Some(env) = &request.env {
        validate_env(env)?;
    }
    let mut command = Command::new(&request.command);
    command
        .args(&request.args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(env) = &request.env {
        for (key, value) in env {
            command.env(key, value);
        }
    }
    let mut child = command
        .spawn()
        .map_err(|e| format!("MCP stdio spawn failed: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(stdin_payload.as_bytes())
            .map_err(|e| format!("MCP stdio stdin failed: {e}"))?;
    }
    let stdout_reader = child
        .stdout
        .take()
        .ok_or_else(|| "MCP stdio stdout unavailable.".to_string())?;
    let stderr_reader = child
        .stderr
        .take()
        .ok_or_else(|| "MCP stdio stderr unavailable.".to_string())?;
    let stdout_handle = collect_output(stdout_reader);
    let stderr_handle = collect_output(stderr_reader);
    let deadline = Instant::now() + Duration::from_millis(timeout);
    let mut timed_out = false;
    loop {
        match child
            .try_wait()
            .map_err(|e| format!("MCP stdio wait failed: {e}"))?
        {
            Some(_) => break,
            None if Instant::now() >= deadline => {
                timed_out = true;
                terminate(&mut child);
                break;
            }
            None => thread::sleep(Duration::from_millis(25)),
        }
    }
    let exit_code = child
        .try_wait()
        .ok()
        .flatten()
        .and_then(|status| status.code());
    let stdout = String::from_utf8_lossy(&stdout_handle.join().unwrap_or_default()).into_owned();
    let stderr = String::from_utf8_lossy(&stderr_handle.join().unwrap_or_default()).into_owned();
    Ok(McpStdioResult {
        stdout,
        stderr,
        exit_code,
        timed_out,
    })
}

#[derive(Debug, Deserialize)]
pub struct McpStdioJsonRpcRequest {
    pub command: String,
    pub args: Vec<String>,
    pub approval_token: String,
    pub timeout_ms: Option<u64>,
    pub env: Option<HashMap<String, String>>,
    pub method: String,
    pub params: serde_json::Value,
    pub with_initialize: Option<bool>,
}

fn jsonrpc_line(id: u64, method: &str, params: serde_json::Value) -> String {
    serde_json::json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    })
    .to_string()
        + "\n"
}

fn parse_jsonrpc_response(line: &str, expected_id: u64) -> Result<serde_json::Value, String> {
    let value: serde_json::Value = serde_json::from_str(line.trim())
        .map_err(|error| format!("MCP JSON-RPC parse failed: {error}"))?;
    if value.get("id").and_then(|id| id.as_u64()) != Some(expected_id) {
        return Err("MCP JSON-RPC response id mismatch.".into());
    }
    if let Some(error) = value.get("error") {
        return Err(format!("MCP JSON-RPC error: {error}"));
    }
    Ok(value
        .get("result")
        .cloned()
        .unwrap_or(serde_json::Value::Null))
}

fn read_jsonrpc_response(
    reader: &mut impl Read,
    expected_id: u64,
    deadline: Instant,
) -> Result<serde_json::Value, String> {
    let mut buffer = String::new();
    let mut chunk = [0u8; 1];
    while Instant::now() < deadline {
        match reader.read(&mut chunk) {
            Ok(0) => break,
            Ok(_) => {
                let ch = chunk[0];
                if ch == b'\n' {
                    if !buffer.trim().is_empty() {
                        if let Ok(value) = parse_jsonrpc_response(&buffer, expected_id) {
                            return Ok(value);
                        }
                    }
                    buffer.clear();
                } else {
                    buffer.push(char::from(ch));
                    if buffer.len() > MAX_OUTPUT_BYTES {
                        return Err("MCP JSON-RPC response exceeded size limit.".into());
                    }
                }
            }
            Err(_) => break,
        }
    }
    if !buffer.trim().is_empty() {
        return parse_jsonrpc_response(&buffer, expected_id);
    }
    Err("MCP JSON-RPC timed out waiting for response.".into())
}

#[tauri::command]
pub fn mcp_stdio_jsonrpc(
    request: McpStdioJsonRpcRequest,
    registry: tauri::State<'_, McpApprovalRegistry>,
) -> Result<serde_json::Value, String> {
    validate_command(&request.command)?;
    validate_args(&request.args)?;
    consume_approval(
        &registry,
        &request.approval_token,
        &request.command,
        &request.args,
    )?;
    if let Some(env) = &request.env {
        validate_env(env)?;
    }
    let timeout = timeout_ms(request.timeout_ms);
    let mut command = Command::new(&request.command);
    command
        .args(&request.args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(env) = &request.env {
        for (key, value) in env {
            command.env(key, value);
        }
    }
    let mut child = command
        .spawn()
        .map_err(|error| format!("MCP stdio spawn failed: {error}"))?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "MCP stdio stdin unavailable.".to_string())?;
    let mut stdout = child
        .stdout
        .take()
        .ok_or_else(|| "MCP stdio stdout unavailable.".to_string())?;
    let deadline = Instant::now() + Duration::from_millis(timeout);
    if request.with_initialize.unwrap_or(true) {
        let init = jsonrpc_line(
            1,
            "initialize",
            serde_json::json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": { "name": "ubermensch", "version": "0.1.0" }
            }),
        );
        stdin
            .write_all(init.as_bytes())
            .map_err(|error| format!("MCP stdio stdin failed: {error}"))?;
        let _ = read_jsonrpc_response(&mut stdout, 1, deadline);
    }
    let rpc = jsonrpc_line(2, &request.method, request.params);
    stdin
        .write_all(rpc.as_bytes())
        .map_err(|error| format!("MCP stdio stdin failed: {error}"))?;
    let result = read_jsonrpc_response(&mut stdout, 2, deadline)?;
    terminate(&mut child);
    Ok(result)
}

#[derive(Debug, Default)]
pub struct McpSessionRegistry {
    sessions: Mutex<HashMap<String, McpSessionRecord>>,
}

#[derive(Debug)]
struct McpSessionRecord {
    fingerprint: String,
    created_at_ms: u64,
    last_used_ms: u64,
    next_rpc_id: u64,
    child: Child,
    stdin: std::process::ChildStdin,
    stdout: std::process::ChildStdout,
}

#[derive(Debug, Deserialize)]
pub struct McpStdioSessionStartRequest {
    pub command: String,
    pub args: Vec<String>,
    pub approval_token: String,
    pub timeout_ms: Option<u64>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
pub struct McpStdioSessionStartResult {
    pub session_id: String,
    pub idle_timeout_ms: u64,
    pub max_lifetime_ms: u64,
}

#[derive(Debug, Deserialize)]
pub struct McpStdioSessionCallRequest {
    pub session_id: String,
    pub method: String,
    pub params: serde_json::Value,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct McpStdioSessionCloseRequest {
    pub session_id: String,
}

#[derive(Debug, Serialize)]
pub struct McpStdioSessionStatus {
    pub session_id: String,
    pub command_fingerprint: String,
    pub created_at_ms: u64,
    pub last_used_ms: u64,
    pub idle_timeout_ms: u64,
    pub max_lifetime_ms: u64,
}

fn new_session_id(fingerprint: &str) -> String {
    let seed = format!("{}:{}", fingerprint, now_ms());
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    format!("mcp-session-{:x}", hasher.finalize())
}

fn session_is_expired(record: &McpSessionRecord, now: u64) -> bool {
    session_timestamps_expired(record.created_at_ms, record.last_used_ms, now)
}

fn session_timestamps_expired(created_at_ms: u64, last_used_ms: u64, now: u64) -> bool {
    now.saturating_sub(last_used_ms) > SESSION_IDLE_MS
        || now.saturating_sub(created_at_ms) > SESSION_MAX_MS
}

fn close_session_record(mut record: McpSessionRecord) {
    terminate(&mut record.child);
}

fn purge_expired_sessions(registry: &McpSessionRegistry) -> Result<(), String> {
    let now = now_ms();
    let mut sessions = registry
        .sessions
        .lock()
        .map_err(|_| "MCP session registry poisoned.")?;
    let expired: Vec<String> = sessions
        .iter()
        .filter(|(_, record)| session_is_expired(record, now))
        .map(|(id, _)| id.clone())
        .collect();
    for id in expired {
        if let Some(record) = sessions.remove(&id) {
            close_session_record(record);
        }
    }
    Ok(())
}

fn spawn_stdio_child(
    command: &str,
    args: &[String],
    env: Option<&HashMap<String, String>>,
) -> Result<(Child, std::process::ChildStdin, std::process::ChildStdout), String> {
    let mut command_builder = Command::new(command);
    command_builder
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(env) = env {
        validate_env(env)?;
        for (key, value) in env {
            command_builder.env(key, value);
        }
    }
    let mut child = command_builder
        .spawn()
        .map_err(|error| format!("MCP stdio spawn failed: {error}"))?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "MCP stdio stdin unavailable.".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "MCP stdio stdout unavailable.".to_string())?;
    Ok((child, stdin, stdout))
}

fn initialize_stdio_session(
    stdin: &mut std::process::ChildStdin,
    stdout: &mut std::process::ChildStdout,
    deadline: Instant,
) -> Result<(), String> {
    let init = jsonrpc_line(
        1,
        "initialize",
        serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": { "name": "ubermensch", "version": "0.1.0" }
        }),
    );
    stdin
        .write_all(init.as_bytes())
        .map_err(|error| format!("MCP stdio stdin failed: {error}"))?;
    let _ = read_jsonrpc_response(stdout, 1, deadline)?;
    let initialized = "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}\n";
    stdin
        .write_all(initialized.as_bytes())
        .map_err(|error| format!("MCP stdio stdin failed: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn mcp_stdio_session_start(
    request: McpStdioSessionStartRequest,
    registry: tauri::State<'_, McpApprovalRegistry>,
    sessions: tauri::State<'_, McpSessionRegistry>,
) -> Result<McpStdioSessionStartResult, String> {
    validate_command(&request.command)?;
    validate_args(&request.args)?;
    consume_approval(
        &registry,
        &request.approval_token,
        &request.command,
        &request.args,
    )?;
    purge_expired_sessions(&sessions)?;
    let mut store = sessions
        .sessions
        .lock()
        .map_err(|_| "MCP session registry poisoned.")?;
    if store.len() >= MAX_SESSIONS {
        return Err(format!(
            "MCP stdio blocked: too many active sessions (max {MAX_SESSIONS}). Close an existing session first."
        ));
    }
    let fingerprint = fingerprint(&request.command, &request.args);
    let timeout = timeout_ms(request.timeout_ms);
    let deadline = Instant::now() + Duration::from_millis(timeout);
    let (child, mut stdin, mut stdout) =
        spawn_stdio_child(&request.command, &request.args, request.env.as_ref())?;
    initialize_stdio_session(&mut stdin, &mut stdout, deadline)?;
    let now = now_ms();
    let session_id = new_session_id(&fingerprint);
    store.insert(
        session_id.clone(),
        McpSessionRecord {
            fingerprint,
            created_at_ms: now,
            last_used_ms: now,
            next_rpc_id: 2,
            child,
            stdin,
            stdout,
        },
    );
    Ok(McpStdioSessionStartResult {
        session_id,
        idle_timeout_ms: SESSION_IDLE_MS,
        max_lifetime_ms: SESSION_MAX_MS,
    })
}

#[tauri::command]
pub fn mcp_stdio_session_call(
    request: McpStdioSessionCallRequest,
    sessions: tauri::State<'_, McpSessionRegistry>,
) -> Result<serde_json::Value, String> {
    if request.method.trim().is_empty() {
        return Err("MCP session call requires a JSON-RPC method.".into());
    }
    purge_expired_sessions(&sessions)?;
    let mut store = sessions
        .sessions
        .lock()
        .map_err(|_| "MCP session registry poisoned.")?;
    let record = store
        .get_mut(&request.session_id)
        .ok_or_else(|| "MCP session not found or expired.".to_string())?;
    let now = now_ms();
    if session_is_expired(record, now) {
        let expired = store.remove(&request.session_id);
        if let Some(record) = expired {
            close_session_record(record);
        }
        return Err("MCP session expired due to idle or max lifetime.".into());
    }
    let rpc_id = record.next_rpc_id;
    record.next_rpc_id += 1;
    record.last_used_ms = now;
    let deadline = Instant::now() + Duration::from_millis(timeout_ms(request.timeout_ms));
    let rpc = jsonrpc_line(rpc_id, &request.method, request.params);
    record
        .stdin
        .write_all(rpc.as_bytes())
        .map_err(|error| format!("MCP stdio stdin failed: {error}"))?;
    read_jsonrpc_response(&mut record.stdout, rpc_id, deadline)
}

#[tauri::command]
pub fn mcp_stdio_session_close(
    request: McpStdioSessionCloseRequest,
    sessions: tauri::State<'_, McpSessionRegistry>,
) -> Result<bool, String> {
    let mut store = sessions
        .sessions
        .lock()
        .map_err(|_| "MCP session registry poisoned.")?;
    let record = store.remove(&request.session_id);
    if let Some(record) = record {
        close_session_record(record);
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn mcp_stdio_session_list(
    sessions: tauri::State<'_, McpSessionRegistry>,
) -> Result<Vec<McpStdioSessionStatus>, String> {
    purge_expired_sessions(&sessions)?;
    let store = sessions
        .sessions
        .lock()
        .map_err(|_| "MCP session registry poisoned.")?;
    Ok(store
        .iter()
        .map(|(session_id, record)| McpStdioSessionStatus {
            session_id: session_id.clone(),
            command_fingerprint: record.fingerprint.clone(),
            created_at_ms: record.created_at_ms,
            last_used_ms: record.last_used_ms,
            idle_timeout_ms: SESSION_IDLE_MS,
            max_lifetime_ms: SESSION_MAX_MS,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_allowlisted_command() {
        assert!(validate_command("rm").is_err());
    }

    #[test]
    fn rejects_path_based_command() {
        assert!(validate_command("/usr/bin/node").is_err());
    }

    #[test]
    fn allows_catalog_sidecar_runtimes() {
        assert!(validate_command("uvx").is_ok());
        assert!(validate_command("docker").is_ok());
    }

    #[test]
    fn clamps_timeout() {
        assert_eq!(timeout_ms(Some(1)), 250);
        assert_eq!(timeout_ms(Some(100_000)), 60_000);
    }

    #[test]
    fn rejects_oversized_args() {
        assert!(validate_args(&["x".repeat(MAX_ARG_BYTES + 1)]).is_err());
    }

    #[test]
    fn rejects_too_many_args() {
        let args: Vec<String> = (0..=MAX_ARGS).map(|_| "x".to_string()).collect();
        assert!(validate_args(&args).is_err());
    }

    #[test]
    fn approval_is_single_use_and_exactly_bound() {
        let registry = McpApprovalRegistry::default();
        let command = "node";
        let args = vec!["server.js".to_string()];
        let token = "token".to_string();
        registry.tokens.lock().unwrap().insert(
            token.clone(),
            ApprovalRecord {
                fingerprint: fingerprint(command, &args),
                expires_at_ms: now_ms() + 10_000,
            },
        );
        assert!(consume_approval(&registry, &token, command, &args).is_ok());
        assert!(consume_approval(&registry, &token, command, &args).is_err());
    }

    #[test]
    fn rejects_exact_argument_mismatch() {
        let registry = McpApprovalRegistry::default();
        let token = "token".to_string();
        registry.tokens.lock().unwrap().insert(
            token.clone(),
            ApprovalRecord {
                fingerprint: fingerprint("node", &["safe.js".into()]),
                expires_at_ms: now_ms() + 10_000,
            },
        );
        assert!(consume_approval(&registry, &token, "node", &["other.js".into()]).is_err());
    }

    #[test]
    fn session_expires_after_idle_or_max_lifetime() {
        let created = 1_000;
        let idle_boundary = created + SESSION_IDLE_MS;
        assert!(!session_timestamps_expired(created, created, idle_boundary));
        assert!(session_timestamps_expired(
            created,
            created,
            idle_boundary + 1
        ));
        let max_boundary = created + SESSION_MAX_MS;
        assert!(!session_timestamps_expired(
            created,
            max_boundary - 1,
            max_boundary - 1
        ));
        assert!(session_timestamps_expired(
            created,
            max_boundary - 1,
            max_boundary + 1
        ));
    }
}
