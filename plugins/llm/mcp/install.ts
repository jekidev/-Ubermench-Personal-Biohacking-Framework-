import { assertCatalogInstallAllowed, validateCustomMcpServer, type CustomMcpInstallInput } from './custom-server'
import {
  getInstalledMcpServer,
  listInstalledMcpServers,
  listResolvedMcpServers,
  removeInstalledMcpServer,
  setInstalledMcpEnabled,
  upsertInstalledMcpServer,
  type InstalledMcpServer,
} from './install-store'
import { getMcpServer } from './servers'

export type McpCatalogItem = {
  serverId: string
  description: string
  executable: string
  args: string[]
  envKeys: string[]
  installed: boolean
  enabled: boolean
  source: 'catalog' | 'custom'
}

function defaultStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function listMcpCatalog(storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): McpCatalogItem[] {
  const installed = listInstalledMcpServers(storage)
  const catalog = listResolvedMcpServers(storage).map((server) => {
    const record = installed.find((item) => item.serverId === server.serverId)
    return {
      serverId: server.serverId,
      description: server.description,
      executable: server.executable,
      args: [...(server.allowedArgs ?? [])],
      envKeys: [...(server.envKeys ?? [])],
      installed: Boolean(record),
      enabled: record?.enabled ?? false,
      source: (record?.source ?? 'catalog') as 'catalog' | 'custom',
    }
  })
  return catalog
}

export function installMcpFromCatalog(
  serverId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): InstalledMcpServer {
  assertCatalogInstallAllowed(serverId)
  const catalog = getMcpServer(serverId)
  if (!catalog) throw new Error(`Unknown MCP catalog server: ${serverId}`)
  const existing = getInstalledMcpServer(serverId, storage)
  const record: InstalledMcpServer = {
    serverId,
    source: 'catalog',
    enabled: true,
    executable: catalog.executable,
    args: [...(catalog.allowedArgs ?? [])],
    envKeys: [...(catalog.envKeys ?? [])],
    description: catalog.description,
    installedAt: existing?.installedAt ?? new Date().toISOString(),
  }
  upsertInstalledMcpServer(record, storage)
  return record
}

export function installCustomMcpServer(
  input: CustomMcpInstallInput,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): InstalledMcpServer {
  const validated = validateCustomMcpServer(input)
  const record: InstalledMcpServer = {
    serverId: validated.serverId,
    source: 'custom',
    enabled: true,
    executable: validated.executable,
    args: [...(validated.allowedArgs ?? [])],
    envKeys: [...(validated.envKeys ?? [])],
    description: validated.description,
    installedAt: new Date().toISOString(),
  }
  upsertInstalledMcpServer(record, storage)
  return record
}

export function uninstallMcpServer(
  serverId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): { serverId: string; uninstalled: true } {
  if (!getInstalledMcpServer(serverId, storage)) {
    throw new Error(`MCP server is not installed: ${serverId}`)
  }
  removeInstalledMcpServer(serverId, storage)
  return { serverId, uninstalled: true }
}

export function mcpInstallStatus(storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()) {
  return {
    catalog: listMcpCatalog(storage),
    installed: listInstalledMcpServers(storage),
  }
}

export { setInstalledMcpEnabled }
