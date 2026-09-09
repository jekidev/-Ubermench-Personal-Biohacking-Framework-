import { mcpHttpRequest } from '../../../../plugins/llm/mcp/http-client'
import type { AgentTool } from '../types'

export function createMcpHttpTools(): AgentTool[] {
  return [
    {
      name: 'mcp.http',
      description: 'Call a remote MCP server over HTTP JSON-RPC after explicit approval.',
      risk: 'high',
      requiresApproval: true,
      async execute(args) {
        const url = typeof args.url === 'string' ? args.url.trim() : ''
        const method = typeof args.method === 'string' ? args.method.trim() : ''
        const params = args.params ?? {}
        const serverId = typeof args.serverId === 'string' ? args.serverId.trim() : 'http-remote'
        if (!url || !method) throw new Error('mcp.http requires url and method.')

        const response = await mcpHttpRequest(
          { serverId, transport: 'http', target: url, payload: params },
          method,
          params,
        )
        return response.result ?? response
      },
    },
  ]
}
