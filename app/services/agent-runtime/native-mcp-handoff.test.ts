import { describe, expect, it } from 'vitest'
import { nativeMcpAgentHref, nativeMcpAgentQuery, parseNativeMcpAgentQuery } from './native-mcp-handoff'
import { ANDROID_RESEARCH_HREF } from '../android-fallbacks'

describe('native MCP Agent handoff', () => {
  it('builds a deep-link with the next server command', () => {
    const calls = [
      { id: 'ps', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
      { id: 'ldr', name: 'mcp.stdio:local-deep-research', args: { method: 'quick_search' }, requiresApproval: true },
    ]
    expect(nativeMcpAgentQuery(calls)).toEqual({
      native: 'mcp.stdio:paper-search',
      command: 'uvx',
      args: 'paper-search-mcp',
    })
    expect(nativeMcpAgentHref(calls)).toContain('/agent?')
    expect(nativeMcpAgentHref(calls)).toContain('command=uvx')
    expect(nativeMcpAgentHref(calls)).toContain('paper-search-mcp')
    expect(nativeMcpAgentHref([])).toBe('/agent')
    expect(nativeMcpAgentHref(calls, 'android-browser')).toBe(ANDROID_RESEARCH_HREF)
    expect(nativeMcpAgentHref(calls, 'android-browser')).not.toContain('command=uvx')
  })

  it('parses Agent query params for preflight fields', () => {
    expect(parseNativeMcpAgentQuery({
      native: 'mcp.stdio:paper-search',
      command: 'uvx',
      args: 'paper-search-mcp',
    })).toEqual({
      native: 'mcp.stdio:paper-search',
      command: 'uvx',
      args: ['paper-search-mcp'],
    })
    expect(parseNativeMcpAgentQuery({
      native: 'mcp.stdio:local-deep-research',
      command: 'uvx',
      args: '--from local-deep-research[mcp] ldr-mcp',
    })?.args).toEqual(['--from', 'local-deep-research[mcp]', 'ldr-mcp'])
    expect(parseNativeMcpAgentQuery({})).toBeNull()
  })
})
