import { ref } from 'vue'
import type { McpToolDefinition } from '../../plugins/llm/mcp/tool-discovery'
import { normalizeMcpToolsListResult } from '../../plugins/llm/mcp/tool-discovery'
import { listResolvedMcpServers } from '../../plugins/llm/mcp/install-store'
import { getInstalledMcpServer } from '../../plugins/llm/mcp/install-store'
import { isTauriRuntime } from '../utils/runtime-platform'
import {
  closeCachedMcpSession,
  listCachedMcpSessions,
  callMcpWithSession,
} from '../services/agent-runtime/mcp-session-pool'
import {
  nativeMcpSessionList,
  type NativeMcpSessionStatus,
} from '../services/agent-runtime/native-mcp'
import { resolveMcpServer, resolveMcpServerEnv } from '../services/agent-runtime/mcp-server-tools'

export type McpSessionView = {
  sessionId: string
  serverId?: string
  commandFingerprint: string
  createdAtMs: number
  lastUsedMs: number
  idleTimeoutMs: number
  maxLifetimeMs: number
  cached: boolean
}

export type McpDiscoveredTools = {
  serverId: string
  tools: McpToolDefinition[]
  sessionId: string
  reusedSession: boolean
  discoveredAt: string
  error?: string
}

function toSessionView(
  native: NativeMcpSessionStatus[],
  cached: ReturnType<typeof listCachedMcpSessions>,
): McpSessionView[] {
  const cachedById = new Map(cached.map((entry) => [entry.sessionId, entry.serverId]))
  const views: McpSessionView[] = native.map((session) => ({
    sessionId: session.session_id,
    serverId: cachedById.get(session.session_id),
    commandFingerprint: session.command_fingerprint,
    createdAtMs: session.created_at_ms,
    lastUsedMs: session.last_used_ms,
    idleTimeoutMs: session.idle_timeout_ms,
    maxLifetimeMs: session.max_lifetime_ms,
    cached: cachedById.has(session.session_id),
  }))
  for (const entry of cached) {
    if (!views.some((view) => view.sessionId === entry.sessionId)) {
      views.push({
        sessionId: entry.sessionId,
        serverId: entry.serverId,
        commandFingerprint: entry.fingerprint,
        createdAtMs: 0,
        lastUsedMs: 0,
        idleTimeoutMs: 0,
        maxLifetimeMs: 0,
        cached: true,
      })
    }
  }
  return views
}

export function useMcpSessions() {
  const sessions = ref<McpSessionView[]>([])
  const discovered = ref<Record<string, McpDiscoveredTools>>({})
  const busy = ref(false)
  const error = ref('')
  const tauriAvailable = ref(isTauriRuntime())

  async function refresh() {
    error.value = ''
    tauriAvailable.value = isTauriRuntime()
    if (!tauriAvailable.value) {
      sessions.value = toSessionView([], listCachedMcpSessions())
      return
    }
    try {
      const native = await nativeMcpSessionList()
      sessions.value = toSessionView(native, listCachedMcpSessions())
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to list MCP sessions'
      sessions.value = toSessionView([], listCachedMcpSessions())
    }
  }

  async function closeSession(serverId: string) {
    busy.value = true
    error.value = ''
    try {
      await closeCachedMcpSession(serverId)
      delete discovered.value[serverId]
      await refresh()
      return true
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to close MCP session'
      return false
    } finally {
      busy.value = false
    }
  }

  async function discoverTools(serverId: string, approvalToken = '') {
    busy.value = true
    error.value = ''
    try {
      if (!isTauriRuntime()) {
        throw new Error('MCP tool discovery requires the Tauri desktop runtime.')
      }
      const server = resolveMcpServer(serverId)
      if (!server) throw new Error(`Unknown MCP server: ${serverId}`)
      const installed = getInstalledMcpServer(serverId)
      if (installed && !installed.enabled) {
        throw new Error(`MCP server ${serverId} is installed but disabled.`)
      }
      const env = await resolveMcpServerEnv(server)
      const session = await callMcpWithSession(server, {
        approvalToken,
        method: 'tools/list',
        params: {},
        env,
      })
      const normalized = normalizeMcpToolsListResult(session.result)
      const entry: McpDiscoveredTools = {
        serverId,
        tools: normalized.tools,
        sessionId: session.sessionId,
        reusedSession: session.reused,
        discoveredAt: new Date().toISOString(),
      }
      discovered.value = { ...discovered.value, [serverId]: entry }
      await refresh()
      return entry
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'MCP tool discovery failed'
      error.value = message
      discovered.value = {
        ...discovered.value,
        [serverId]: {
          serverId,
          tools: [],
          sessionId: '',
          reusedSession: false,
          discoveredAt: new Date().toISOString(),
          error: message,
        },
      }
      throw cause
    } finally {
      busy.value = false
    }
  }

  function installedServers() {
    return listResolvedMcpServers().filter((server) => {
      const installed = getInstalledMcpServer(server.serverId)
      return installed?.enabled ?? false
    })
  }

  function formatSessionAge(ms: number): string {
    if (!ms) return '—'
    const ageSec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
    if (ageSec < 60) return `${ageSec}s ago`
    if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`
    return `${Math.floor(ageSec / 3600)}h ago`
  }

  return {
    sessions,
    discovered,
    busy,
    error,
    tauriAvailable,
    refresh,
    closeSession,
    discoverTools,
    installedServers,
    formatSessionAge,
  }
}
