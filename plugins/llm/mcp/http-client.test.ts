import { describe, expect, it, vi } from 'vitest'
import { mcpHttpRequest } from './http-client'

describe('mcp http client', () => {
  it('posts JSON-RPC and returns the result', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await mcpHttpRequest(
      { serverId: 'remote', transport: 'http', target: 'https://mcp.example/mcp', payload: {} },
      'tools/list',
      {},
    )

    expect(response.result).toEqual({ tools: [] })
    expect(fetchMock).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('rejects stdio transport', async () => {
    await expect(mcpHttpRequest(
      { serverId: 'remote', transport: 'stdio', target: 'ignored', command: 'node', payload: {} },
      'tools/list',
      {},
    )).rejects.toThrow('HTTP')
  })
})
