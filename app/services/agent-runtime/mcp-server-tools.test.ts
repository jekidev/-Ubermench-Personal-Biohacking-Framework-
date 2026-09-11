import { describe, expect, it } from 'vitest'
import { createMcpServerTools, isMcpStdioToolName, resolveMcpServer, resolveNativeMcpPreflightRequest } from './mcp-server-tools'

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

  it('blocks raw JSON-RPC bypasses for policy-restricted servers', async () => {
    const paperSearch = createMcpServerTools().find((tool) => tool.name === 'mcp.stdio:paper-search')
    await expect(paperSearch?.execute({
      __approvalToken: 'approve-1',
      stdinPayload: '{"method":"tools/call","params":{"name":"download_scihub"}}',
    })).rejects.toThrow(/policy-checked method calls/i)
  })
})
