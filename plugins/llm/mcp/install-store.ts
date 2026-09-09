import type { McpServerRegistryEntry } from './servers'
import { MCP_SERVER_REGISTRY, getMcpServer } from './servers'

export const MCP_INSTALL_STORAGE_KEY = 'ubermensch:mcp-installs:v1'

export type InstalledMcpServer = {
  serverId: string
  source: 'catalog' | 'custom'
  enabled: boolean
  executable: string
  args: string[]
  envKeys: string[]
  description: string
  installedAt: string
}

export type McpInstallStore = {
  schemaVersion: 1
  servers: InstalledMcpServer[]
}

function defaultStore(): McpInstallStore {
  return { schemaVersion: 1, servers: [] }
}

function defaultStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function loadMcpInstallStore(storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): McpInstallStore {
  if (!storage) return defaultStore()
  try {
    const raw = storage.getItem(MCP_INSTALL_STORAGE_KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw) as McpInstallStore
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.servers)) return defaultStore()
    return parsed
  } catch {
    return defaultStore()
  }
}

export function saveMcpInstallStore(store: McpInstallStore, storage: Pick<Storage, 'setItem'> | undefined = defaultStorage()): void {
  storage?.setItem(MCP_INSTALL_STORAGE_KEY, JSON.stringify(store))
}

export function listInstalledMcpServers(storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): InstalledMcpServer[] {
  return loadMcpInstallStore(storage).servers
}

export function getInstalledMcpServer(serverId: string, storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): InstalledMcpServer | undefined {
  return listInstalledMcpServers(storage).find((server) => server.serverId === serverId)
}

export function isMcpServerInstalled(serverId: string, storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): boolean {
  return Boolean(getInstalledMcpServer(serverId, storage))
}

export function installedServerToRegistry(server: InstalledMcpServer): McpServerRegistryEntry {
  return {
    serverId: server.serverId,
    executable: server.executable,
    allowedArgs: server.args,
    description: server.description,
    enabledByDefault: server.enabled,
    auth: server.envKeys.length ? 'env' : 'approval',
    envKeys: server.envKeys,
  }
}

export function resolveInstalledOrCatalogServer(serverId: string, storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): McpServerRegistryEntry | undefined {
  const installed = getInstalledMcpServer(serverId, storage)
  if (installed) return installedServerToRegistry(installed)
  return getMcpServer(serverId)
}

export function listResolvedMcpServers(storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): McpServerRegistryEntry[] {
  const installed = listInstalledMcpServers(storage)
  const custom = installed.filter((server) => server.source === 'custom').map(installedServerToRegistry)
  const seen = new Set(MCP_SERVER_REGISTRY.map((server) => server.serverId))
  const extra = custom.filter((server) => {
    if (seen.has(server.serverId)) return false
    seen.add(server.serverId)
    return true
  })
  return [...MCP_SERVER_REGISTRY, ...extra]
}

export function upsertInstalledMcpServer(
  server: InstalledMcpServer,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): McpInstallStore {
  const store = loadMcpInstallStore(storage)
  const index = store.servers.findIndex((item) => item.serverId === server.serverId)
  if (index >= 0) store.servers[index] = server
  else store.servers.push(server)
  saveMcpInstallStore(store, storage)
  return store
}

export function setInstalledMcpEnabled(
  serverId: string,
  enabled: boolean,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): InstalledMcpServer {
  const existing = getInstalledMcpServer(serverId, storage)
  if (!existing) throw new Error(`MCP server is not installed: ${serverId}`)
  const next = { ...existing, enabled }
  upsertInstalledMcpServer(next, storage)
  return next
}

export function removeInstalledMcpServer(
  serverId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): McpInstallStore {
  const store = loadMcpInstallStore(storage)
  store.servers = store.servers.filter((server) => server.serverId !== serverId)
  saveMcpInstallStore(store, storage)
  return store
}
