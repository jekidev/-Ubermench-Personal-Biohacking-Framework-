import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMcpDiscoveryTools, isMcpDiscoveryToolName } from './mcp-discovery-tools'

vi.mock('../mcp-session-pool', () => ({
  callMcpWithSession: vi.fn(async (_server, input) => ({
    result:
      input.method === 'tools/list'
        ? { tools: [{ name: 'ping', description: 'Ping' }] }
        : { content: [{ type: 'text', text: 'pong' }] },
    sessionId: 'session-1',
    reused: false,
  })),
}))

vi.mock('../mcp-server-tools', () => ({
  resolveMcpServer: vi.fn((serverId: string) =>
    serverId === 'discord'
      ? {
          serverId: 'discord',
          description: 'Discord MCP',
          executable: 'npx',
          allowedArgs: ['-y', '@modelcontextprotocol/server-discord'],
          enabledByDefault: false,
        }
      : undefined,
  ),
  resolveMcpServerEnv: vi.fn(async () => ({})),
}))

vi.mock('../../../../plugins/llm/mcp/install-store', () => ({
  getInstalledMcpServer: vi.fn(() => ({ enabled: true })),
}))

describe('mcp discovery tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers list and call tools', () => {
    const names = createMcpDiscoveryTools().map((tool) => tool.name)
    expect(names).toEqual(['mcp.tools.list', 'mcp.tools.call'])
    expect(isMcpDiscoveryToolName('mcp.tools.list')).toBe(true)
    expect(isMcpDiscoveryToolName('mcp.stdio:discord')).toBe(false)
  })

  it('lists tools for a known server', async () => {
    const list = createMcpDiscoveryTools().find((tool) => tool.name === 'mcp.tools.list')
    const result = await list?.execute({ serverId: 'discord', __approvalToken: 'approve-1' })
    expect(result).toMatchObject({
      serverId: 'discord',
      sessionId: 'session-1',
      tools: [{ name: 'ping', description: 'Ping' }],
    })
  })

  it('calls a tool by name', async () => {
    const call = createMcpDiscoveryTools().find((tool) => tool.name === 'mcp.tools.call')
    const result = await call?.execute({
      serverId: 'discord',
      name: 'ping',
      arguments: { echo: true },
      __approvalToken: 'approve-1',
    })
    expect(result).toMatchObject({
      serverId: 'discord',
      name: 'ping',
      content: [{ type: 'text', text: 'pong' }],
    })
  })
})
