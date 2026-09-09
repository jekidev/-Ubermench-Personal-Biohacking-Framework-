import { validateMcpRequest, type McpRequest } from './transport'

export type McpHttpResponse = {
  jsonrpc?: string
  id?: number | string
  result?: unknown
  error?: { code?: number; message?: string; data?: unknown }
}

export async function mcpHttpRequest(
  request: McpRequest,
  method: string,
  params: unknown,
  signal?: AbortSignal,
): Promise<McpHttpResponse> {
  validateMcpRequest(request)
  if (request.transport !== 'http') {
    throw new Error('mcpHttpRequest only supports HTTP transport.')
  }

  const response = await fetch(request.target, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    signal,
  })

  const body = await response.json().catch(() => ({})) as McpHttpResponse
  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}: ${body.error?.message ?? 'request failed'}`)
  }
  if (body.error?.message) {
    throw new Error(`MCP error: ${body.error.message}`)
  }
  return body
}
