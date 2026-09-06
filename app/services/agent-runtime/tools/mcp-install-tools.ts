import type { AgentTool } from '../types'
import {
  installCustomMcpServer,
  installMcpFromCatalog,
  listMcpCatalog,
  mcpInstallStatus,
  uninstallMcpServer,
} from '../../../../plugins/llm/mcp/install'

export function createMcpInstallTools(): AgentTool[] {
  return [
    {
      name: 'mcp.catalog',
      description: 'List allowlisted MCP servers and which ones are installed locally.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return listMcpCatalog()
      },
    },
    {
      name: 'mcp.status',
      description: 'Show installed MCP servers, enablement, and required env key names (never secret values).',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return mcpInstallStatus()
      },
    },
    {
      name: 'mcp.install',
      description: 'Install an allowlisted MCP server, or a custom stdio server after explicit user confirmation. Persists command/args/env key names only.',
      risk: 'high',
      requiresApproval: true,
      async execute(args) {
        const source = typeof args.source === 'string' ? args.source : 'catalog'
        if (source === 'custom') {
          const rawArgs = Array.isArray(args.args) ? args.args.filter((item): item is string => typeof item === 'string') : []
          const envKeys = Array.isArray(args.envKeys) ? args.envKeys.filter((item): item is string => typeof item === 'string') : []
          return installCustomMcpServer({
            serverId: typeof args.serverId === 'string' ? args.serverId : '',
            executable: typeof args.executable === 'string' ? args.executable : '',
            args: rawArgs,
            envKeys,
            description: typeof args.description === 'string' ? args.description : undefined,
            userConfirmed: args.userConfirmed === true,
          })
        }
        const serverId = typeof args.serverId === 'string' ? args.serverId : ''
        if (!serverId) throw new Error('mcp.install requires serverId.')
        return installMcpFromCatalog(serverId)
      },
    },
    {
      name: 'mcp.uninstall',
      description: 'Remove a locally installed MCP server configuration. Does not delete secrets.',
      risk: 'high',
      requiresApproval: true,
      async execute(args) {
        const serverId = typeof args.serverId === 'string' ? args.serverId : ''
        if (!serverId) throw new Error('mcp.uninstall requires serverId.')
        return uninstallMcpServer(serverId)
      },
    },
  ]
}

export function isMcpLifecycleToolName(name: string): boolean {
  return name === 'mcp.install' || name === 'mcp.uninstall' || name === 'mcp.stdio' || name.startsWith('mcp.stdio:')
}
