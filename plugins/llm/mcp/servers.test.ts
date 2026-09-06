import { describe, expect, it } from 'vitest'
import { getMcpServer } from './servers'

describe('mcp server registry', () => {
  it('includes discord bridge configuration', () => {
    const discord = getMcpServer('discord')
    expect(discord?.executable).toBe('npx')
    expect(discord?.envKeys).toContain('DISCORD_BOT_TOKEN')
  })
})
