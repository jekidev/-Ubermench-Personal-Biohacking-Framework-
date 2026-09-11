import { resolveMcpServer } from './agent-runtime/mcp-server-tools'
import { nativeMcpPreflight } from './agent-runtime/native-mcp'
import { isTauriRuntime } from '~/utils/runtime-platform'

export const MCP_SIDECAR_SETTINGS_HREF = '/settings?tab=research'
export const MCP_SIDECAR_MEMORY_HREF = '/settings?tab=memory'
export const MCP_SIDECAR_BROWSER_MESSAGE =
  'Sidecars are not started from the browser. Open the Tauri desktop app, then use Check sidecar. uvx and Docker are never auto-started.'

export type McpSidecarCheck = {
  ok: boolean
  tauri: boolean
  serverId: string
  command?: string
  args?: string[]
  error?: string
  settingsHref: string
}

function settingsHrefFor(serverId: string): string {
  if (serverId === 'supermemory' || serverId === 'mem0' || serverId === 'memory') {
    return MCP_SIDECAR_MEMORY_HREF
  }
  return MCP_SIDECAR_SETTINGS_HREF
}

export async function checkMcpSidecar(serverId: string): Promise<McpSidecarCheck> {
  const trimmed = serverId.trim()
  const href = settingsHrefFor(trimmed)
  const tauri = isTauriRuntime()
  const server = resolveMcpServer(trimmed)
  if (!server?.executable.trim()) {
    return {
      ok: false,
      tauri,
      serverId: trimmed,
      error: `Unknown MCP sidecar ${trimmed || '(empty)'}. Enable it in Settings first.`,
      settingsHref: href,
    }
  }
  const command = server.executable
  const args = server.allowedArgs ? [...server.allowedArgs] : []
  if (!tauri) {
    return {
      ok: false,
      tauri: false,
      serverId: trimmed,
      command,
      args,
      error: MCP_SIDECAR_BROWSER_MESSAGE,
      settingsHref: href,
    }
  }
  try {
    await nativeMcpPreflight(command, args)
    return {
      ok: true,
      tauri: true,
      serverId: trimmed,
      command,
      args,
      settingsHref: href,
    }
  } catch (cause) {
    return {
      ok: false,
      tauri: true,
      serverId: trimmed,
      command,
      args,
      error: cause instanceof Error ? cause.message : String(cause),
      settingsHref: href,
    }
  }
}
