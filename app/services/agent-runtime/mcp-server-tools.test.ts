import { describe, expect, it } from 'vitest'
import { createMcpServerTools, formatNextNativePreflightLabel, isMcpStdioToolName, nativeCallsMatchingPreflight, nextNativePreflightTarget, resolveMcpServer, resolveNativeMcpPreflightRequest, selectNativeApprovalCallIds } from './mcp-server-tools'

describe('mcp server tools', () => {
  it('registers discord stdio tool', () => {
    const tools = createMcpServerTools()
    const discord = tools.find((tool) => tool.name === 'mcp.stdio:discord')
    expect(discord).toBeTruthy()
    expect(discord?.requiresApproval).toBe(true)
  })

  it('detects mcp stdio tool names', () => {
    expect(isMcpStdioToolName('mcp.stdio')).toBe(true)
    expect(isMcpStdioToolName('mcp.stdio:discord')).toBe(true)
    expect(isMcpStdioToolName('memory.search')).toBe(false)
  })

  it('resolves discord server config', () => {
    const server = resolveMcpServer('discord')
    expect(server?.executable).toBe('npx')
    expect(server?.envKeys).toContain('DISCORD_BOT_TOKEN')
  })

  it('resolves preflight command from pending mcp.stdio server tools', () => {
    expect(resolveNativeMcpPreflightRequest({
      name: 'mcp.stdio:paper-search',
      args: { method: 'search_pubmed' },
    })).toEqual({ command: 'uvx', args: ['paper-search-mcp'] })
    expect(resolveNativeMcpPreflightRequest({
      name: 'mcp.stdio',
      args: { command: 'node', args: ['server.js'] },
    })).toEqual({ command: 'node', args: ['server.js'] })
    expect(resolveNativeMcpPreflightRequest({ name: 'research.paperqa.ask', args: {} })).toBeNull()
  })

  it('matches native calls to one preflight command at a time', () => {
    const calls = [
      { id: 'ps', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' } },
      { id: 'ldr', name: 'mcp.stdio:local-deep-research', args: { method: 'quick_search' } },
    ]
    expect(nativeCallsMatchingPreflight(calls, 'uvx', ['paper-search-mcp']).map((call) => call.id)).toEqual(['ps'])
    expect(nativeCallsMatchingPreflight(calls, 'uvx', ['--from', 'local-deep-research[mcp]', 'ldr-mcp']).map((call) => call.id)).toEqual(['ldr'])
    expect(nextNativePreflightTarget(calls)).toEqual({
      callId: 'ps',
      name: 'mcp.stdio:paper-search',
      command: 'uvx',
      args: ['paper-search-mcp'],
    })
    expect(formatNextNativePreflightLabel(calls)).toContain('mcp.stdio:paper-search')
    expect(formatNextNativePreflightLabel(calls)).toContain('uvx paper-search-mcp')
    expect(formatNextNativePreflightLabel(calls)).toContain('mcp.stdio:local-deep-research')
    expect(selectNativeApprovalCallIds(calls, { nativeCommand: 'uvx', nativeArgs: ['paper-search-mcp'] })).toEqual(['ps'])
    expect(selectNativeApprovalCallIds(calls, { nativeCommand: 'uvx', nativeArgs: ['--from', 'local-deep-research[mcp]', 'ldr-mcp'] })).toEqual(['ldr'])
    expect(selectNativeApprovalCallIds(calls)).toEqual(['ps'])
  })

  it('blocks raw JSON-RPC bypasses for policy-restricted servers', async () => {
    const paperSearch = createMcpServerTools().find((tool) => tool.name === 'mcp.stdio:paper-search')
    await expect(paperSearch?.execute({
      __approvalToken: 'approve-1',
      stdinPayload: '{"method":"tools/call","params":{"name":"download_scihub"}}',
    })).rejects.toThrow(/policy-checked method calls/i)
  })
})
