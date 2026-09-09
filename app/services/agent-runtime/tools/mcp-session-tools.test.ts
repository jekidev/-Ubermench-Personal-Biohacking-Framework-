import { describe, expect, it } from 'vitest'
import { createMcpSessionTools, isMcpSessionToolName } from './mcp-session-tools'

describe('mcp session tools', () => {
  it('registers list and close tools', () => {
    const names = createMcpSessionTools().map((tool) => tool.name)
    expect(names).toEqual(['mcp.session.list', 'mcp.session.close'])
  })

  it('detects session tool names', () => {
    expect(isMcpSessionToolName('mcp.session.list')).toBe(true)
    expect(isMcpSessionToolName('mcp.stdio:discord')).toBe(false)
  })
})
