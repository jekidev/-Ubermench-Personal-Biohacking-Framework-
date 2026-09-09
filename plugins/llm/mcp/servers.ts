import type { StdioServerDefinition } from './stdio-allowlist'

export type McpServerRegistryEntry = StdioServerDefinition & {
  description: string
  enabledByDefault: boolean
  auth?: 'approval' | 'env' | 'none'
  envKeys?: string[]
  connectorId?: string
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
    serverId: 'paper-search',
    connectorId: 'paper-search',
    executable: 'uvx',
    allowedArgs: ['paper-search-mcp'],
    description: 'Open-access paper search. Sci-Hub tools stay disabled.',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['PAPER_SEARCH_MCP_UNPAYWALL_EMAIL', 'PAPER_SEARCH_MCP_SEMANTIC_SCHOLAR_API_KEY'],
  },
  {
    serverId: 'paper-qa',
    connectorId: 'paper-qa',
    executable: 'paperqa',
    description: 'Local PaperQA2 sidecar for cited PDF answers',
    enabledByDefault: false,
    auth: 'none',
  },
  {
    serverId: 'local-deep-research',
    connectorId: 'local-deep-research',
    executable: 'ldr-mcp',
    description: 'Local Deep Research MCP sidecar for cited research summaries',
    enabledByDefault: false,
    auth: 'env',
    envKeys: ['LDR_LLM_PROVIDER', 'LDR_LLM_OLLAMA_URL'],
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
