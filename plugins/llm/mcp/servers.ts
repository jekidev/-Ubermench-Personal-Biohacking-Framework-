import type { StdioServerDefinition } from './stdio-allowlist'

export type McpServerRegistryEntry = StdioServerDefinition & {
  description: string
  enabledByDefault: boolean
  auth?: 'approval' | 'env' | 'none'
  envKeys?: string[]
  connectorId?: string
  deniedTools?: readonly string[]
  forcedToolArguments?: Readonly<Record<string, Readonly<Record<string, unknown>>>>
}

export const MCP_SERVER_REGISTRY: McpServerRegistryEntry[] = [
  {
    serverId: 'discord',
    connectorId: 'discord',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-discord'],
    description: 'Discord messaging bridge via MCP stdio server',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['DISCORD_BOT_TOKEN'],
  },
  {
    serverId: 'github',
    connectorId: 'github',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-github'],
    description: 'GitHub issues, PRs, and repository search',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
  },
  {
    serverId: 'slack',
    connectorId: 'slack',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-slack'],
    description: 'Slack workspace messaging bridge',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
  },
  {
    serverId: 'tavily',
    connectorId: 'tavily',
    executable: 'npx',
    allowedArgs: ['-y', 'tavily-mcp@latest'],
    description: 'Tavily web search for research agents',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['TAVILY_API_KEY'],
  },
  {
    serverId: 'context7',
    connectorId: 'context7',
    executable: 'npx',
    allowedArgs: ['-y', '@upstash/context7-mcp@latest'],
    description: 'Live library documentation lookup',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['CONTEXT7_API_KEY'],
  },
  {
    serverId: 'huggingface',
    connectorId: 'huggingface',
    executable: 'npx',
    allowedArgs: ['-y', '@huggingface/mcp-client@latest'],
    description: 'Hugging Face Hub filesystem and model discovery',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['HF_TOKEN', 'HUGGINGFACE_TOKEN'],
  },
  {
    serverId: 'filesystem',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-filesystem'],
    description: 'Local filesystem MCP (install only; spawn still needs approval)',
    enabledByDefault: false,
    auth: 'approval',
  },
  {
    serverId: 'memory',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-memory'],
    description: 'Knowledge-graph memory MCP server',
    enabledByDefault: false,
    auth: 'none',
  },
  {
    serverId: 'fetch',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-fetch'],
    description: 'HTTP fetch MCP server for public URLs',
    enabledByDefault: false,
    auth: 'approval',
  },
  {
    serverId: 'notion',
    connectorId: 'notion',
    executable: 'npx',
    allowedArgs: ['-y', '@notionhq/notion-mcp-server'],
    description: 'Notion pages and databases via MCP',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['NOTION_API_KEY'],
  },
  {
    serverId: 'paper-search',
    connectorId: 'paper-search',
    executable: 'uvx',
    allowedArgs: ['paper-search-mcp'],
    description: 'Open-access academic paper search (Sci-Hub is blocked by local policy)',
    enabledByDefault: false,
    auth: 'env',
    envKeys: [
      'PAPER_SEARCH_MCP_UNPAYWALL_EMAIL',
      'PAPER_SEARCH_MCP_CORE_API_KEY',
      'PAPER_SEARCH_MCP_SEMANTIC_SCHOLAR_API_KEY',
      'PAPER_SEARCH_MCP_DOAJ_API_KEY',
    ],
    deniedTools: ['download_scihub'],
    forcedToolArguments: {
      download_with_fallback: { use_scihub: false },
    },
  },
  {
    serverId: 'local-deep-research',
    connectorId: 'local-deep-research',
    executable: 'uvx',
    allowedArgs: ['--from', 'local-deep-research[mcp]', 'ldr-mcp'],
    description: 'Local Deep Research cited-research sidecar over stdio',
    enabledByDefault: false,
    auth: 'env',
    envKeys: [
      'LDR_LLM_PROVIDER',
      'LDR_LLM_MODEL',
      'LDR_LLM_OPENAI_API_KEY',
      'LDR_LLM_ANTHROPIC_API_KEY',
      'LDR_SEARCH_TOOL',
    ],
  },
  {
    serverId: 'transcriptor',
    connectorId: 'transcriptor',
    executable: 'docker',
    allowedArgs: ['run', '--rm', '-i', 'artsamsonov/transcriptor-mcp:latest', 'npm', 'run', 'start:mcp'],
    description: 'YouTube/podcast transcripts via transcriptor-mcp (Docker sidecar). Hosted HTTP endpoint also available.',
    enabledByDefault: false,
    auth: 'none',
  },
]

export function getMcpServer(serverId: string): McpServerRegistryEntry | undefined {
  return MCP_SERVER_REGISTRY.find((entry) => entry.serverId === serverId)
}

export function getMcpServerByConnector(connectorId: string): McpServerRegistryEntry | undefined {
  return MCP_SERVER_REGISTRY.find((entry) => entry.connectorId === connectorId)
}
