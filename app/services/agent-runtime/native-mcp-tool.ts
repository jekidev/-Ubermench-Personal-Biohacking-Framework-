import { invoke } from '@tauri-apps/api/core'
import type { AgentToolCall } from './types'

export interface NativeMcpRequest {
  serverId: string
  command: string
  args: string[]
  timeoutMs?: number
  payload: string
}

export interface NativeMcpApproval {
  token: string
  expires_in_ms: number
}

export interface NativeMcpResult {
  stdout: string
  stderr: string
  exit_code: number | null
  timed_out: boolean
}

export async function preflightNativeMcp(request: NativeMcpRequest) {
  return invoke<{ transport: 'stdio'; command: string; args: string[]; timeout_ms: number }>('mcp_stdio_preflight', {
    request: { command: request.command, args: request.args, approval_token: '', timeout_ms: request.timeoutMs },
  })
}

/** Must only be called from an explicit human approval action in the UI. */
export async function issueNativeMcpApproval(request: Pick<NativeMcpRequest, 'command' | 'args'>): Promise<NativeMcpApproval> {
  return invoke<NativeMcpApproval>('mcp_issue_approval', {
    request: { command: request.command, args: request.args },
  })
}

export async function executeApprovedNativeMcp(request: NativeMcpRequest, approvalToken: string): Promise<NativeMcpResult> {
  if (!approvalToken.trim()) throw new Error('Native MCP execution requires an explicit approval token.')
  return invoke<NativeMcpResult>('mcp_stdio_execute', {
    request: {
      command: request.command,
      args: request.args,
      approval_token: approvalToken,
      timeout_ms: request.timeoutMs,
    },
    stdinPayload: request.payload,
  })
}

export function nativeMcpToolCall(call: AgentToolCall, request: NativeMcpRequest): AgentToolCall {
  return {
    ...call,
    name: `mcp.stdio:${request.serverId}`,
    requiresApproval: true,
    args: {
      serverId: request.serverId,
      command: request.command,
      args: request.args,
      timeoutMs: request.timeoutMs,
      payload: request.payload,
    },
  }
}
