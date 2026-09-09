import type { AgentTool } from '../types'
import { closeCachedMcpSession, listCachedMcpSessions } from '../mcp-session-pool'
import { nativeMcpSessionList } from '../native-mcp'

export function createMcpSessionTools(): AgentTool[] {
  return [
    {
      name: 'mcp.session.list',
      description: 'List active native MCP stdio sessions (Tauri only) with idle and lifetime metadata.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return {
          native: await nativeMcpSessionList(),
          cached: listCachedMcpSessions(),
        }
      },
    },
    {
      name: 'mcp.session.close',
      description: 'Close a cached MCP stdio session for a server id and terminate the child process.',
      risk: 'medium',
      requiresApproval: false,
      async execute(args) {
        const serverId = typeof args.serverId === 'string' ? args.serverId : ''
        if (!serverId) throw new Error('mcp.session.close requires serverId.')
        const closed = await closeCachedMcpSession(serverId)
        return { serverId, closed }
      },
    },
  ]
}

export function isMcpSessionToolName(name: string): boolean {
  return name === 'mcp.session.list' || name === 'mcp.session.close'
}
