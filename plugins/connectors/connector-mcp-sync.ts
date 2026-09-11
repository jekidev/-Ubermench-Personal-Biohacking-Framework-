import { installMcpFromCatalog } from '../llm/mcp/install'
import { getInstalledMcpServer, setInstalledMcpEnabled } from '../llm/mcp/install-store'
import { getConnector } from './registry'
import type { ConnectorId } from './types'

type ConnectorMcpStorage = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): ConnectorMcpStorage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function syncConnectorMcpInstall(
  id: ConnectorId,
  enabled: boolean,
  storage: ConnectorMcpStorage | undefined = defaultStorage(),
): void {
  const connector = getConnector(id)
  if (!connector?.mcpServerId) return

  if (enabled) {
    installMcpFromCatalog(connector.mcpServerId, storage)
    return
  }

  const installed = getInstalledMcpServer(connector.mcpServerId, storage)
  if (installed) setInstalledMcpEnabled(connector.mcpServerId, false, storage)
}
