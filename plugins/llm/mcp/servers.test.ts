import { describe, expect, it } from 'vitest'
import { getMcpServer, MCP_SERVER_REGISTRY } from './servers'

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

  it('wires the approved research sidecars', () => {
    const paperSearch = getMcpServer('paper-search')
    expect(paperSearch?.executable).toBe('uvx')
    expect(paperSearch?.allowedArgs).toEqual(['paper-search-mcp'])
    expect(paperSearch?.deniedTools).toContain('download_scihub')

    const localDeepResearch = getMcpServer('local-deep-research')
    expect(localDeepResearch?.executable).toBe('uvx')
    expect(localDeepResearch?.allowedArgs).toContain('ldr-mcp')
  })

  it('does not contain duplicate server or connector ids', () => {
    const serverIds = MCP_SERVER_REGISTRY.map((server) => server.serverId)
    const connectorIds = MCP_SERVER_REGISTRY
      .map((server) => server.connectorId)
      .filter((id): id is string => Boolean(id))
    expect(new Set(serverIds).size).toBe(serverIds.length)
    expect(new Set(connectorIds).size).toBe(connectorIds.length)
  })
})
