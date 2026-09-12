import type { AgentTool } from './types'
import { createDefaultToolGateway } from './tool-gateway'

export type AgentToolCatalogEntry = {
  name: string
  description: string
  risk: AgentTool['risk']
  requiresApproval: boolean
}

export function toAgentToolCatalogEntry(tool: Pick<AgentTool, 'name' | 'description' | 'risk' | 'requiresApproval'>): AgentToolCatalogEntry {
  const name = tool.name.trim()
  if (!name) throw new Error('Agent tool name is required')
  return {
    name,
    description: tool.description.trim(),
    risk: tool.risk,
    requiresApproval: tool.requiresApproval,
  }
}

export function listAgentToolCatalog(
  tools: Array<Pick<AgentTool, 'name' | 'description' | 'risk' | 'requiresApproval'>> = createDefaultToolGateway().list(),
): AgentToolCatalogEntry[] {
  return tools.map(toAgentToolCatalogEntry).sort((left, right) => left.name.localeCompare(right.name))
}

export function isPluginAgentToolName(name: string): boolean {
  return name.trim().startsWith('plugins.')
}

export function isResearchAgentToolName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.startsWith('research.') || trimmed === 'mcp.stdio:paper-search' || trimmed === 'mcp.stdio:local-deep-research' || trimmed === 'mcp.stdio:transcriptor'
}

export function getAgentToolCatalogEntry(
  name: string,
  tools: AgentToolCatalogEntry[] = listAgentToolCatalog(),
): AgentToolCatalogEntry | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  return tools.find((tool) => tool.name === trimmed)
}

export function formatAgentToolCatalog(tools: AgentToolCatalogEntry[] = listAgentToolCatalog()): string {
  if (!tools.length) return 'Available tools: none'
  const lines = tools.map((tool) => {
    const approval = tool.requiresApproval ? 'approval' : 'auto'
    return `- ${tool.name} [${tool.risk}/${approval}] ${tool.description}`
  })
  return `Available tools (call via JSON toolCalls; never invent approval tokens):\n${lines.join('\n')}`
}
