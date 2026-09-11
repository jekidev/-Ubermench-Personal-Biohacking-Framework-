import type { McpServerRegistryEntry } from '../../../plugins/llm/mcp/servers'
import { getInstalledMcpServer, listResolvedMcpServers } from '../../../plugins/llm/mcp/install-store'
import { validateStdioCommand } from '../../../plugins/llm/mcp/stdio-allowlist'
import { getSecret } from '../secret-vault'
import type { AgentTool } from './types'
import { nativeMcpExecute } from './native-mcp'
import { callMcpWithSession } from './mcp-session-pool'
import { isMcpLifecycleToolName } from './tools/mcp-install-tools'

export function isMcpStdioToolName(name: string): boolean {
  return isMcpLifecycleToolName(name)
}

export function sameNativePreflight(
  left: { command: string; args: string[] },
  right: { command: string; args: string[] },
): boolean {
  return left.command === right.command
    && left.args.length === right.args.length
    && left.args.every((value, index) => value === right.args[index])
}

export function nativeCallsMatchingPreflight(
  calls: Array<{ id: string; name: string; args?: Record<string, unknown> }>,
  command: string,
  args: string[],
): Array<{ id: string; name: string; args?: Record<string, unknown> }> {
  const target = { command: command.trim(), args }
  if (!target.command) return []
  return calls.filter((call) => {
    const resolved = resolveNativeMcpPreflightRequest(call)
    return resolved ? sameNativePreflight(resolved, target) : false
  })
}

export function nextNativePreflightTarget(
  calls: Array<{ id: string; name: string; args?: Record<string, unknown> }>,
): { callId: string; name: string; command: string; args: string[] } | null {
  for (const call of calls) {
    const resolved = resolveNativeMcpPreflightRequest(call)
    if (!resolved) continue
    return { callId: call.id, name: call.name, command: resolved.command, args: resolved.args }
  }
  return null
}

export function selectNativeApprovalCallIds(
  calls: Array<{ id: string; name: string; args?: Record<string, unknown> }>,
  options: { nativeCommand?: string; nativeArgs?: string[]; nativeCallId?: string } = {},
): string[] {
  if (options.nativeCallId) return [options.nativeCallId]
  const command = options.nativeCommand?.trim()
  if (command) {
    const matched = nativeCallsMatchingPreflight(calls, command, options.nativeArgs ?? [])
    if (matched.length) return matched.map((call) => call.id)
  }
  return calls[0]?.id ? [calls[0].id] : []
}

export function formatNextNativePreflightLabel(
  calls: Array<{ id: string; name: string; args?: Record<string, unknown> }>,
): string | null {
  const next = nextNativePreflightTarget(calls)
  if (!next) return null
  const command = [next.command, ...next.args].join(' ').trim()
  const remaining = calls.filter((call) => call.id !== next.callId).map((call) => call.name)
  const suffix = remaining.length ? ` Then: ${remaining.join(', ')}.` : ''
  return `Next native command: ${next.name} (${command}).${suffix}`
}

export function resolveNativeMcpPreflightRequest(call: {
  name: string
  args?: Record<string, unknown>
}): { command: string; args: string[] } | null {
  const name = call.name.trim()
  const args = call.args ?? {}
  if (name === 'mcp.stdio') {
    const command = typeof args.command === 'string' ? args.command.trim() : ''
    if (!command) return null
    const commandArgs = Array.isArray(args.args) && args.args.every((value) => typeof value === 'string')
      ? args.args
      : []
    return { command, args: commandArgs }
  }
  if (!name.startsWith('mcp.stdio:')) return null
  const server = resolveMcpServer(name.slice('mcp.stdio:'.length))
  if (!server?.executable.trim()) return null
  return {
    command: server.executable,
    args: server.allowedArgs ? [...server.allowedArgs] : [],
  }
}

export function resolveMcpServer(serverId: string): McpServerRegistryEntry | undefined {
  return listResolvedMcpServers().find((entry) => entry.serverId === serverId)
}

export async function resolveMcpServerEnv(server: McpServerRegistryEntry): Promise<Record<string, string>> {
  const env: Record<string, string> = {}
  for (const key of server.envKeys ?? []) {
    const value = await getSecret(key)
    if (value) env[key] = value
  }
  return env
}

export function createMcpServerTools(): AgentTool[] {
  return listResolvedMcpServers().map((server) => ({
    name: `mcp.stdio:${server.serverId}`,
    description: server.description,
    risk: 'high' as const,
    requiresApproval: true,
    async execute(args) {
      const installed = getInstalledMcpServer(server.serverId)
      if (installed && !installed.enabled) {
        throw new Error(`MCP server ${server.serverId} is installed but disabled.`)
      }
      const command = server.executable
      const commandArgs = server.allowedArgs ? [...server.allowedArgs] : []
      validateStdioCommand(server, command, commandArgs)
      const approvalToken = typeof args.__approvalToken === 'string' ? args.__approvalToken : ''
      const stdinPayload = typeof args.stdinPayload === 'string' ? args.stdinPayload : ''
      const timeoutMs = typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined
      const env = await resolveMcpServerEnv(server)
      const method = typeof args.method === 'string' ? args.method : ''
      const params = args.params ?? {}
      if (method) {
        const session = await callMcpWithSession(server, {
          approvalToken,
          method,
          params,
          timeoutMs,
          env,
          reuseSession: args.reuseSession !== false,
        })
        return {
          result: session.result,
          sessionId: session.sessionId,
          reusedSession: session.reused,
        }
      }
      if (server.deniedTools?.length || server.forcedToolArguments) {
        throw new Error(`MCP server ${server.serverId} requires policy-checked method calls.`)
      }
      return nativeMcpExecute(command, commandArgs, approvalToken, stdinPayload, timeoutMs, env)
    },
  }))
}
