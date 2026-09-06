import { describe, expect, it } from 'vitest'
import { getMcpServer } from './servers'

describe('mcp server registry', () => {
  it('includes discord bridge configuration', () => {
    const discord = getMcpServer('discord')
    expect(discord?.executable).toBe('npx')
    expect(discord?.envKeys).toContain('DISCORD_BOT_TOKEN')
  })

  it('links MCP servers to connector ids', () => {
    expect(getMcpServer('github')?.connectorId).toBe('github')
    expect(getMcpServer('huggingface')?.connectorId).toBe('huggingface')
    expect(getMcpServer('filesystem')?.executable).toBe('npx')
    expect(getMcpServer('memory')?.serverId).toBe('memory')
  })
})
