import type { McpServerRegistryEntry } from './servers'
import type { McpToolDefinition } from './tool-discovery'

type McpToolCallParams = {
  name: string
  arguments: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export function assertMcpToolAllowed(server: McpServerRegistryEntry, toolName: string): void {
  if (server.deniedTools?.includes(toolName)) {
    throw new Error(`MCP tool ${toolName} is disabled by local policy for ${server.serverId}.`)
  }
}

export function applyMcpToolPolicy(
  server: McpServerRegistryEntry,
  toolName: string,
  args: Record<string, unknown>,
): McpToolCallParams {
  assertMcpToolAllowed(server, toolName)
  return {
    name: toolName,
    arguments: {
      ...args,
      ...server.forcedToolArguments?.[toolName],
    },
  }
}

export function applyMcpRequestPolicy(
  server: McpServerRegistryEntry,
  method: string,
  params: unknown,
): unknown {
  if (method !== 'tools/call') return params
  const record = asRecord(params)
  const name = typeof record.name === 'string' ? record.name : ''
  if (!name) throw new Error('MCP tools/call request requires a tool name.')
  return applyMcpToolPolicy(server, name, asRecord(record.arguments))
}

export function filterMcpToolsByPolicy(
  server: McpServerRegistryEntry,
  tools: McpToolDefinition[],
): McpToolDefinition[] {
  const denied = new Set(server.deniedTools ?? [])
  return tools.filter((tool) => !denied.has(tool.name))
}
