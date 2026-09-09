export type JsonRpcMessage = {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

export function buildJsonRpcLine(message: JsonRpcMessage): string {
  return `${JSON.stringify(message)}\n`
}

export function parseJsonRpcStdout(stdout: string, expectedId = 1): unknown {
  const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean)
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { id?: number; result?: unknown; error?: { message?: string } }
      if (parsed.id !== expectedId) continue
      if (parsed.error?.message) throw new Error(parsed.error.message)
      return parsed.result ?? parsed
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unexpected token') throw error
    }
  }
  throw new Error('No JSON-RPC response found in MCP stdout.')
}
