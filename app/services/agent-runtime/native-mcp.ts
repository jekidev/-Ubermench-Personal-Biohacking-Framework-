import { invoke } from '@tauri-apps/api/core'

export interface NativeMcpPreflight {
  transport: 'stdio'
  command: string
  args: string[]
  timeout_ms: number
}

export interface NativeMcpResult {
  stdout: string
  stderr: string
  exit_code?: number | null
  timed_out: boolean
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function nativeMcpPreflight(command: string, args: string[], timeoutMs?: number): Promise<NativeMcpPreflight> {
  if (!isTauriRuntime()) throw new Error('Native MCP execution is available only in the Tauri runtime.')
  return invoke<NativeMcpPreflight>('mcp_stdio_preflight', {
    request: { command, args, approval_token: '', timeout_ms: timeoutMs },
  })
}

export async function nativeMcpExecute(
  command: string,
  args: string[],
  approvalToken: string,
  stdinPayload = '',
  timeoutMs?: number,
  env?: Record<string, string>,
): Promise<NativeMcpResult> {
  if (!isTauriRuntime()) throw new Error('Native MCP execution is available only in the Tauri runtime.')
  if (!approvalToken.trim()) throw new Error('Native MCP execution requires an explicit approval token.')
  return invoke<NativeMcpResult>('mcp_stdio_execute', {
    request: { command, args, approval_token: approvalToken, timeout_ms: timeoutMs, env },
    stdinPayload,
  })
}

export async function issueNativeMcpApproval(command: string, args: string[]) {
  if (!isTauriRuntime()) throw new Error('Native MCP approval is available only in the Tauri runtime.')
  return invoke<{ token: string; expires_in_ms: number }>('mcp_issue_approval', {
    request: { command, args },
  })
}

export async function nativeMcpJsonRpc(
  command: string,
  args: string[],
  approvalToken: string,
  method: string,
  params: unknown,
  options?: { timeoutMs?: number; env?: Record<string, string>; withInitialize?: boolean },
): Promise<unknown> {
  if (!isTauriRuntime()) throw new Error('Native MCP JSON-RPC is available only in the Tauri runtime.')
  if (!approvalToken.trim()) throw new Error('Native MCP JSON-RPC requires an explicit approval token.')
  return invoke<unknown>('mcp_stdio_jsonrpc', {
    request: {
      command,
      args,
      approval_token: approvalToken,
      timeout_ms: options?.timeoutMs,
      env: options?.env,
      method,
      params,
      with_initialize: options?.withInitialize ?? true,
    },
  })
}

export interface NativeMcpSessionStartResult {
  session_id: string
  idle_timeout_ms: number
  max_lifetime_ms: number
}

export interface NativeMcpSessionStatus {
  session_id: string
  command_fingerprint: string
  created_at_ms: number
  last_used_ms: number
  idle_timeout_ms: number
  max_lifetime_ms: number
}

export async function nativeMcpSessionStart(
  command: string,
  args: string[],
  approvalToken: string,
  options?: { timeoutMs?: number; env?: Record<string, string> },
): Promise<NativeMcpSessionStartResult> {
  if (!isTauriRuntime()) throw new Error('Native MCP sessions are available only in the Tauri runtime.')
  if (!approvalToken.trim()) throw new Error('Native MCP session start requires an explicit approval token.')
  return invoke<NativeMcpSessionStartResult>('mcp_stdio_session_start', {
    request: {
      command,
      args,
      approval_token: approvalToken,
      timeout_ms: options?.timeoutMs,
      env: options?.env,
    },
  })
}

export async function nativeMcpSessionCall(
  sessionId: string,
  method: string,
  params: unknown,
  timeoutMs?: number,
): Promise<unknown> {
  if (!isTauriRuntime()) throw new Error('Native MCP sessions are available only in the Tauri runtime.')
  return invoke<unknown>('mcp_stdio_session_call', {
    request: {
      session_id: sessionId,
      method,
      params,
      timeout_ms: timeoutMs,
    },
  })
}

export async function nativeMcpSessionClose(sessionId: string): Promise<boolean> {
  if (!isTauriRuntime()) throw new Error('Native MCP sessions are available only in the Tauri runtime.')
  return invoke<boolean>('mcp_stdio_session_close', {
    request: { session_id: sessionId },
  })
}

export async function nativeMcpSessionList(): Promise<NativeMcpSessionStatus[]> {
  if (!isTauriRuntime()) throw new Error('Native MCP sessions are available only in the Tauri runtime.')
  return invoke<NativeMcpSessionStatus[]>('mcp_stdio_session_list')
}
