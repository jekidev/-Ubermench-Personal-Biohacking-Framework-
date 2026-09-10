import {
  buildMcpToolCallParams,
  buildMcpToolsListParams,
  normalizeMcpToolCallResult,
  normalizeMcpToolsListResult,
} from '../../../../plugins/llm/mcp/tool-discovery'
import { validateStdioCommand } from '../../../../plugins/llm/mcp/stdio-allowlist'
import { getInstalledMcpServer } from '../../../../plugins/llm/mcp/install-store'
import { callMcpWithSession } from '../mcp-session-pool'
import { resolveMcpServer, resolveMcpServerEnv } from '../mcp-server-tools'
import type { AgentTool } from '../types'

export function createMcpDiscoveryTools(): AgentTool[] {
  return [
    {
      name: 'mcp.tools.list',
      description: 'Discover tools exposed by an installed MCP stdio server via tools/list (reuses long-lived sessions when available).',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        const serverId = typeof args.serverId === 'string' ? args.serverId : ''
        if (!serverId) throw new Error('mcp.tools.list requires serverId.')
        const server = resolveMcpServer(serverId)
        if (!server) throw new Error(`Unknown MCP server: ${serverId}.`)
        const installed = getInstalledMcpServer(serverId)
        if (installed && !installed.enabled) {
          throw new Error(`MCP server ${serverId} is installed but disabled.`)
        }
        validateStdioCommand(server, server.executable, [...(server.allowedArgs ?? [])])
        const approvalToken = typeof args.__approvalToken === 'string' ? args.__approvalToken : ''
        const timeoutMs = typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined
        const cursor = typeof args.cursor === 'string' ? args.cursor : undefined
        const env = await resolveMcpServerEnv(server)
        const session = await callMcpWithSession(server, {
          approvalToken,
          method: 'tools/list',
          params: buildMcpToolsListParams(cursor),
          timeoutMs,
          env,
          reuseSession: args.reuseSession !== false,
        })
        return {
          serverId,
          sessionId: session.sessionId,
          reusedSession: session.reused,
          ...normalizeMcpToolsListResult(session.result),
        }
      },
    },
    {
      name: 'mcp.tools.call',
      description: 'Invoke a tool on an installed MCP stdio server via tools/call (requires approval to start or reuse a session).',
      risk: 'high',
      requiresApproval: true,
      async execute(args) {
        const serverId = typeof args.serverId === 'string' ? args.serverId : ''
        const toolName = typeof args.name === 'string' ? args.name : ''
        if (!serverId) throw new Error('mcp.tools.call requires serverId.')
        if (!toolName) throw new Error('mcp.tools.call requires name.')
        const server = resolveMcpServer(serverId)
        if (!server) throw new Error(`Unknown MCP server: ${serverId}.`)
        const installed = getInstalledMcpServer(serverId)
        if (installed && !installed.enabled) {
          throw new Error(`MCP server ${serverId} is installed but disabled.`)
        }
        validateStdioCommand(server, server.executable, [...(server.allowedArgs ?? [])])
        const approvalToken = typeof args.__approvalToken === 'string' ? args.__approvalToken : ''
        const timeoutMs = typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined
        const toolArgs =
          args.arguments && typeof args.arguments === 'object' && !Array.isArray(args.arguments)
            ? args.arguments as Record<string, unknown>
            : {}
        const env = await resolveMcpServerEnv(server)
        const session = await callMcpWithSession(server, {
          approvalToken,
          method: 'tools/call',
          params: buildMcpToolCallParams(toolName, toolArgs),
          timeoutMs,
          env,
          reuseSession: args.reuseSession !== false,
        })
        return {
          serverId,
          name: toolName,
          sessionId: session.sessionId,
          reusedSession: session.reused,
          ...normalizeMcpToolCallResult(session.result),
        }
      },
    },
  ]
}

export function isMcpDiscoveryToolName(name: string): boolean {
  return name === 'mcp.tools.list' || name === 'mcp.tools.call'
}
