import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  callMcpWithSession,
  clearCachedMcpSession,
  listCachedMcpSessions,
  mcpSessionFingerprint,
} from './mcp-session-pool'
import type { McpServerRegistryEntry } from '../../../plugins/llm/mcp/servers'
import { nativeMcpSessionCall } from './native-mcp'

vi.mock('./native-mcp', () => ({
  nativeMcpSessionStart: vi.fn(async () => ({
    session_id: 'session-1',
    idle_timeout_ms: 300_000,
    max_lifetime_ms: 1_800_000,
  })),
  nativeMcpSessionCall: vi.fn(async (_sessionId: string, method: string, params: unknown) => ({ method, params, ok: true })),
  nativeMcpSessionClose: vi.fn(async () => true),
}))

const server: McpServerRegistryEntry = {
  serverId: 'discord',
  description: 'Discord MCP',
  executable: 'npx',
  allowedArgs: ['-y', '@modelcontextprotocol/server-discord'],
  enabledByDefault: false,
  envKeys: ['DISCORD_BOT_TOKEN'],
}

describe('mcp session pool', () => {
  beforeEach(() => {
    clearCachedMcpSession()
    vi.clearAllMocks()
  })

  it('builds a stable fingerprint for command and args', () => {
    expect(mcpSessionFingerprint(server)).toContain('npx')
    expect(mcpSessionFingerprint(server)).toContain('@modelcontextprotocol/server-discord')
  })

  it('starts a session on first JSON-RPC call and reuses it', async () => {
    const first = await callMcpWithSession(server, {
      approvalToken: 'approve-1',
      method: 'tools/list',
      params: {},
    })
    expect(first.reused).toBe(false)
    expect(first.sessionId).toBe('session-1')
    expect(listCachedMcpSessions()).toHaveLength(1)

    const second = await callMcpWithSession(server, {
      approvalToken: '',
      method: 'tools/call',
      params: { name: 'ping' },
    })
    expect(second.reused).toBe(true)
    expect(second.sessionId).toBe('session-1')
  })

  it('requires approval when starting a new session without cache', async () => {
    await expect(callMcpWithSession(server, {
      approvalToken: '',
      method: 'tools/list',
      params: {},
    })).rejects.toThrow(/requires approval/)
  })

  it('enforces server tool policy before native execution', async () => {
    const restrictedServer: McpServerRegistryEntry = {
      ...server,
      serverId: 'paper-search',
      forcedToolArguments: {
        download_with_fallback: { use_scihub: false },
      },
    }
    await callMcpWithSession(restrictedServer, {
      approvalToken: 'approve-1',
      method: 'tools/call',
      params: {
        name: 'download_with_fallback',
        arguments: { doi: '10.1000/example', use_scihub: true },
      },
    })

    expect(vi.mocked(nativeMcpSessionCall)).toHaveBeenCalledWith(
      'session-1',
      'tools/call',
      {
        name: 'download_with_fallback',
        arguments: { doi: '10.1000/example', use_scihub: false },
      },
      undefined,
    )
  })
})
