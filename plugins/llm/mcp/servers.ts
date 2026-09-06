import type { StdioServerDefinition } from './stdio-allowlist'

export type McpServerRegistryEntry = StdioServerDefinition & {
  description: string
  enabledByDefault: boolean
  auth?: 'approval' | 'env' | 'none'
  envKeys?: string[]
}

export const MCP_SERVER_REGISTRY: McpServerRegistryEntry[] = [
  {
    serverId: 'discord',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-discord'],
    description: 'Discord messaging bridge via MCP stdio server',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['DISCORD_BOT_TOKEN'],
  },
]

export function getMcpServer(serverId: string): McpServerRegistryEntry | undefined {
  return MCP_SERVER_REGISTRY.find((entry) => entry.serverId === serverId)
}
