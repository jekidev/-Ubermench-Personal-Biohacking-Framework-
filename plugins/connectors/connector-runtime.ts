import { getSecret } from '../../app/services/secret-vault'
import { getMcpServer } from '../llm/mcp/servers'
import { CONNECTOR_REGISTRY, getConnector } from './registry'
import { isConnectorEnabled, loadConnectorSettings } from './connector-store'
import { isGoogleConnected } from './oauth/google-token-store'
import type { ConnectorConnectionStatus, ConnectorId, ConnectorStatusSnapshot } from './types'

const GOOGLE_CONNECTORS = new Set<ConnectorId>(['gmail', 'google-drive'])

async function resolveConfiguredKeys(envKeys: string[] = []): Promise<{ present: string[]; missing: string[] }> {
  const present: string[] = []
  const missing: string[] = []
  for (const key of envKeys) {
    const value = await getSecret(key)
    if (value?.trim()) present.push(key)
    else missing.push(key)
  }
  return { present, missing }
}

export async function getConnectorStatus(id: ConnectorId): Promise<ConnectorStatusSnapshot> {
  const connector = getConnector(id)
  if (!connector) throw new Error(`Unknown connector: ${id}`)

  const enabled = isConnectorEnabled(id)
  const { missing } = await resolveConfiguredKeys(connector.auth.envKeys)

  let status: ConnectorConnectionStatus = 'disabled'
  if (!enabled) status = 'disabled'
  else if (connector.status === 'planned') status = 'unavailable'
  else if (GOOGLE_CONNECTORS.has(connector.id)) {
    status = (await isGoogleConnected()) ? 'connected' : (missing.length ? 'missing-credentials' : 'missing-credentials')
  }
  else if (connector.auth.type === 'oauth') status = missing.length ? 'missing-credentials' : 'configured'
  else if (connector.auth.type === 'none') status = 'connected'
  else if (missing.length === 0) status = connector.status === 'live' ? 'connected' : 'configured'
  else status = 'missing-credentials'

  if (connector.mcpServerId && !getMcpServer(connector.mcpServerId)) {
    status = 'unavailable'
  }

  return {
    id: connector.id,
    name: connector.name,
    enabled,
    status,
    transport: connector.transport,
    missing,
    capabilities: connector.capabilities,
    cursorParity: connector.cursorParity,
    implementationStatus: connector.status,
  }
}

export async function listConnectorStatuses(): Promise<ConnectorStatusSnapshot[]> {
  return Promise.all(CONNECTOR_REGISTRY.map((connector) => getConnectorStatus(connector.id)))
}

export function listEnabledConnectorDefinitions() {
  const settings = loadConnectorSettings()
  return CONNECTOR_REGISTRY.filter((connector) => settings.enabled[connector.id])
}

export async function resolveConnectorEnv(id: ConnectorId): Promise<Record<string, string>> {
  const connector = getConnector(id)
  if (!connector) throw new Error(`Unknown connector: ${id}`)
  const env: Record<string, string> = {}
  for (const key of connector.auth.envKeys ?? []) {
    const value = await getSecret(key)
    if (value) env[key] = value
  }
  return env
}
