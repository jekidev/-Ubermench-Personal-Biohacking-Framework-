import type { ConnectorId } from './types'
import { CONNECTOR_REGISTRY, getConnector } from './registry'

const STORAGE_KEY = 'ubermensch:connector-settings:v1'

export type ConnectorSettings = {
  enabled: Record<ConnectorId, boolean>
}

export function isConnectorActivatable(id: ConnectorId): boolean {
  return getConnector(id)?.status === 'live'
}

function sanitizeEnabled(enabled: Record<ConnectorId, boolean>): Record<ConnectorId, boolean> {
  const next = { ...enabled }
  for (const connector of CONNECTOR_REGISTRY) {
    if (connector.status !== 'live') next[connector.id] = false
  }
  return next
}

function defaultSettings(): ConnectorSettings {
  const enabled = {} as Record<ConnectorId, boolean>
  for (const connector of CONNECTOR_REGISTRY) {
    enabled[connector.id] = connector.status === 'live' && connector.enabledByDefault
  }
  return { enabled }
}

export function loadConnectorSettings(storage: Storage = localStorage): ConnectorSettings {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<ConnectorSettings>
    return {
      ...defaultSettings(),
      ...parsed,
      enabled: sanitizeEnabled({ ...defaultSettings().enabled, ...parsed.enabled }),
    }
  } catch {
    return defaultSettings()
  }
}

export function saveConnectorSettings(settings: ConnectorSettings, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    ...settings,
    enabled: sanitizeEnabled(settings.enabled),
  }))
}

export function isConnectorEnabled(id: ConnectorId, storage: Storage = localStorage): boolean {
  if (!isConnectorActivatable(id)) return false
  return loadConnectorSettings(storage).enabled[id] ?? false
}

export function setConnectorEnabled(id: ConnectorId, enabled: boolean, storage: Storage = localStorage): ConnectorSettings {
  if (enabled && !isConnectorActivatable(id)) {
    const status = getConnector(id)?.status ?? 'unknown'
    throw new Error(`${id} is not implemented yet (${status}).`)
  }
  const next = loadConnectorSettings(storage)
  next.enabled[id] = enabled
  saveConnectorSettings(next, storage)
  return next
}
