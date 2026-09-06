import { MCP_SERVER_REGISTRY, type McpServerRegistryEntry } from '../../../plugins/llm/mcp/servers'
import { validateStdioCommand } from '../../../plugins/llm/mcp/stdio-allowlist'
import { getSecret } from '../secret-vault'
import type { AgentTool } from './types'
import { nativeMcpExecute } from './native-mcp'

export function isMcpStdioToolName(name: string): boolean {
  return name === 'mcp.stdio' || name.startsWith('mcp.stdio:')
}

export function resolveMcpServer(serverId: string): McpServerRegistryEntry | undefined {
  return MCP_SERVER_REGISTRY.find((entry) => entry.serverId === serverId)
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
  return MCP_SERVER_REGISTRY.map((server) => ({
    name: `mcp.stdio:${server.serverId}`,
    description: server.description,
    risk: 'high' as const,
    requiresApproval: true,
    async execute(args) {
      const command = server.executable
      const commandArgs = server.allowedArgs ? [...server.allowedArgs] : []
      validateStdioCommand(server, command, commandArgs)
      const approvalToken = typeof args.__approvalToken === 'string' ? args.__approvalToken : ''
      const stdinPayload = typeof args.stdinPayload === 'string' ? args.stdinPayload : ''
      const timeoutMs = typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined
      const env = await resolveMcpServerEnv(server)
      return nativeMcpExecute(command, commandArgs, approvalToken, stdinPayload, timeoutMs, env)
    },
  }))
}
