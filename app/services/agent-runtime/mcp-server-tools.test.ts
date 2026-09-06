import { describe, expect, it } from 'vitest'
import { createMcpServerTools, isMcpStdioToolName, resolveMcpServer } from './mcp-server-tools'

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
})
