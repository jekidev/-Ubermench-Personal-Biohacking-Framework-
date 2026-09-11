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
