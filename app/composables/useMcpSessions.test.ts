import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMcpSessions } from './useMcpSessions'

vi.mock('../utils/runtime-platform', () => ({
  isTauriRuntime: vi.fn(() => true),
}))

vi.mock('../services/agent-runtime/mcp-session-pool', () => ({
  listCachedMcpSessions: vi.fn(() => [{ sessionId: 'session-1', serverId: 'discord', fingerprint: 'fp' }]),
  closeCachedMcpSession: vi.fn(async () => true),
  callMcpWithSession: vi.fn(async () => ({
    result: { tools: [{ name: 'ping', description: 'Ping server' }] },
    sessionId: 'session-1',
    reused: true,
  })),
}))

vi.mock('../services/agent-runtime/native-mcp', () => ({
  nativeMcpSessionList: vi.fn(async () => [{
    session_id: 'session-1',
    command_fingerprint: 'fp',
    created_at_ms: Date.now() - 60_000,
    last_used_ms: Date.now() - 5_000,
    idle_timeout_ms: 300_000,
    max_lifetime_ms: 1_800_000,
  }]),
}))

vi.mock('../services/agent-runtime/mcp-server-tools', () => ({
  resolveMcpServer: vi.fn((serverId: string) =>
    serverId === 'discord'
      ? {
          serverId: 'discord',
          executable: 'npx',
          allowedArgs: ['-y', '@modelcontextprotocol/server-discord'],
          description: 'Discord MCP',
          enabledByDefault: false,
        }
      : undefined,
  ),
  resolveMcpServerEnv: vi.fn(async () => ({})),
}))

vi.mock('../../plugins/llm/mcp/install-store', () => ({
  listResolvedMcpServers: vi.fn(() => [{
    serverId: 'discord',
    executable: 'npx',
    allowedArgs: ['-y', '@modelcontextprotocol/server-discord'],
    description: 'Discord MCP',
    enabledByDefault: false,
  }]),
  getInstalledMcpServer: vi.fn(() => ({ enabled: true })),
}))

describe('useMcpSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists native and cached sessions', async () => {
    const mcpSessions = useMcpSessions()
    await mcpSessions.refresh()
    expect(mcpSessions.sessions.value).toHaveLength(1)
    expect(mcpSessions.sessions.value[0]?.serverId).toBe('discord')
  })

  it('discovers tools for an installed server', async () => {
    const mcpSessions = useMcpSessions()
    const result = await mcpSessions.discoverTools('discord', 'approve-1')
    expect(result.tools).toEqual([{ name: 'ping', description: 'Ping server' }])
    expect(mcpSessions.discovered.value.discord?.reusedSession).toBe(true)
  })
})
