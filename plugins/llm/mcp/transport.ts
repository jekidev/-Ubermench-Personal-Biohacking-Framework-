export type McpTransport = 'http' | 'stdio'

export type McpRequest = {
  serverId: string
  transport: McpTransport
  target: string
  command?: string
  args?: string[]
  payload: unknown
}

export function validateMcpRequest(request: McpRequest): void {
  if (!request.serverId.trim() || !request.target.trim()) {
    throw new Error('Invalid MCP request: serverId and target are required.')
  }

  if (request.transport === 'stdio' && !request.command?.trim()) {
    throw new Error('Invalid MCP stdio request: command is required.')
  }

  if (request.transport === 'http' && request.command) {
    throw new Error('Invalid MCP HTTP request: command is not allowed.')
  }
}
