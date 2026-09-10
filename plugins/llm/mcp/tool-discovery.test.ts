import { describe, expect, it } from 'vitest'
import {
  buildMcpToolCallParams,
  buildMcpToolsListParams,
  normalizeMcpToolCallResult,
  normalizeMcpToolsListResult,
} from './tool-discovery'

describe('mcp tool discovery', () => {
  it('normalizes tools/list payloads', () => {
    const normalized = normalizeMcpToolsListResult({
      tools: [
        { name: 'search', description: 'Search papers', inputSchema: { type: 'object' } },
        { description: 'missing name' },
        'invalid',
      ],
    })
    expect(normalized.tools).toEqual([
      { name: 'search', description: 'Search papers', inputSchema: { type: 'object' } },
    ])
  })

  it('normalizes tools/call payloads', () => {
    const normalized = normalizeMcpToolCallResult({
      content: [{ type: 'text', text: 'hello' }],
      isError: false,
    })
    expect(normalized.content).toEqual([{ type: 'text', text: 'hello', data: undefined, mimeType: undefined }])
    expect(normalized.isError).toBe(false)
  })

  it('builds JSON-RPC params for list and call', () => {
    expect(buildMcpToolsListParams()).toEqual({})
    expect(buildMcpToolsListParams('next')).toEqual({ cursor: 'next' })
    expect(buildMcpToolCallParams('ping', { echo: true })).toEqual({
      name: 'ping',
      arguments: { echo: true },
    })
  })

  it('rejects empty tool names for call params', () => {
    expect(() => buildMcpToolCallParams('  ')).toThrow(/required/i)
  })
})
