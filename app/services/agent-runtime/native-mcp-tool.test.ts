import { describe, expect, it } from 'vitest'
import { nativeMcpToolCall } from './native-mcp-tool'

describe('native MCP tool adapter', () => {
  it('marks native MCP calls as approval-bound', () => {
    const call = nativeMcpToolCall({ id: 'c1', name: 'mcp', args: {} }, {
      serverId: 'demo',
      command: 'node',
      args: ['server.js'],
      payload: '{}',
    })
    expect(call.requiresApproval).toBe(true)
    expect(call.name).toBe('mcp.stdio:demo')
  })
})
