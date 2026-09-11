import type { McpServerRegistryEntry } from '../../../plugins/llm/mcp/servers'
import { applyMcpRequestPolicy } from '../../../plugins/llm/mcp/tool-policy'
import {
  nativeMcpSessionCall,
  nativeMcpSessionClose,
  nativeMcpSessionStart,
} from './native-mcp'

type SessionEntry = {
  sessionId: string
  serverId: string
  fingerprint: string
}

const pool = new Map<string, SessionEntry>()

export function mcpSessionFingerprint(server: Pick<McpServerRegistryEntry, 'executable' | 'allowedArgs'>): string {
  const args = server.allowedArgs ?? []
  return `${server.executable}\0${args.join('\0')}`
}

export function getCachedMcpSession(serverId: string): SessionEntry | undefined {
  return pool.get(serverId)
}

export function listCachedMcpSessions(): SessionEntry[] {
  return [...pool.values()]
}

export function clearCachedMcpSession(serverId?: string): void {
  if (serverId) pool.delete(serverId)
  else pool.clear()
}

export async function callMcpWithSession(
  server: McpServerRegistryEntry,
  input: {
    approvalToken: string
    method: string
    params: unknown
    timeoutMs?: number
    env?: Record<string, string>
    reuseSession?: boolean
  },
): Promise<{ result: unknown; sessionId: string; reused: boolean }> {
  const fingerprint = mcpSessionFingerprint(server)
  const reuse = input.reuseSession !== false
  const params = applyMcpRequestPolicy(server, input.method, input.params)

  if (reuse) {
    const cached = pool.get(server.serverId)
    if (cached && cached.fingerprint === fingerprint) {
      try {
        const result = await nativeMcpSessionCall(cached.sessionId, input.method, params, input.timeoutMs)
        return { result, sessionId: cached.sessionId, reused: true }
      } catch {
        pool.delete(server.serverId)
        await nativeMcpSessionClose(cached.sessionId).catch(() => undefined)
      }
    }
  }

  if (!input.approvalToken.trim()) {
    throw new Error(`MCP session for ${server.serverId} requires approval to start a new stdio session.`)
  }

  const started = await nativeMcpSessionStart(
    server.executable,
    [...(server.allowedArgs ?? [])],
    input.approvalToken,
    { timeoutMs: input.timeoutMs, env: input.env },
  )
  pool.set(server.serverId, {
    sessionId: started.session_id,
    serverId: server.serverId,
    fingerprint,
  })
  const result = await nativeMcpSessionCall(started.session_id, input.method, params, input.timeoutMs)
  return { result, sessionId: started.session_id, reused: false }
}

export async function closeCachedMcpSession(serverId: string): Promise<boolean> {
  const cached = pool.get(serverId)
  if (!cached) return false
  pool.delete(serverId)
  return nativeMcpSessionClose(cached.sessionId)
}
