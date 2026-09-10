export type McpToolDefinition = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export type McpToolsListResult = {
  tools: McpToolDefinition[]
}

export type McpToolCallResult = {
  content: Array<{ type?: string; text?: string; data?: string; mimeType?: string }>
  isError?: boolean
  structuredContent?: unknown
}

export function normalizeMcpToolsListResult(result: unknown): McpToolsListResult {
  if (!result || typeof result !== 'object') return { tools: [] }
  const tools = (result as { tools?: unknown }).tools
  if (!Array.isArray(tools)) return { tools: [] }
  return {
    tools: tools
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        name: typeof entry.name === 'string' ? entry.name : '',
        description: typeof entry.description === 'string' ? entry.description : undefined,
        inputSchema:
          entry.inputSchema && typeof entry.inputSchema === 'object'
            ? entry.inputSchema as Record<string, unknown>
            : undefined,
      }))
      .filter((entry) => entry.name.length > 0),
  }
}

export function normalizeMcpToolCallResult(result: unknown): McpToolCallResult {
  if (!result || typeof result !== 'object') return { content: [] }
  const record = result as Record<string, unknown>
  const content = Array.isArray(record.content)
    ? record.content.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : []
  return {
    content: content.map((item) => ({
      type: typeof item.type === 'string' ? item.type : undefined,
      text: typeof item.text === 'string' ? item.text : undefined,
      data: typeof item.data === 'string' ? item.data : undefined,
      mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
    })),
    isError: record.isError === true,
    structuredContent: record.structuredContent,
  }
}

export function buildMcpToolsListParams(cursor?: string): Record<string, unknown> {
  return cursor ? { cursor } : {}
}

export function buildMcpToolCallParams(name: string, args: Record<string, unknown> = {}): Record<string, unknown> {
  if (!name.trim()) throw new Error('MCP tool name is required.')
  return { name: name.trim(), arguments: args }
}
