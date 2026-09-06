import type { ConnectorId } from './types'
import { CONNECTOR_REGISTRY } from './registry'

const STORAGE_KEY = 'ubermensch:connector-settings:v1'

export type ConnectorSettings = {
  enabled: Record<ConnectorId, boolean>
}

function defaultSettings(): ConnectorSettings {
  const enabled = {} as Record<ConnectorId, boolean>
  for (const connector of CONNECTOR_REGISTRY) {
    enabled[connector.id] = connector.enabledByDefault
  }
  return { enabled }
}

export function loadConnectorSettings(storage: Storage = localStorage): ConnectorSettings {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<ConnectorSettings>
    return { ...defaultSettings(), ...parsed, enabled: { ...defaultSettings().enabled, ...parsed.enabled } }
  } catch {
    return defaultSettings()
  }
}

export function saveConnectorSettings(settings: ConnectorSettings, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function isConnectorEnabled(id: ConnectorId, storage: Storage = localStorage): boolean {
  return loadConnectorSettings(storage).enabled[id] ?? false
}

export function setConnectorEnabled(id: ConnectorId, enabled: boolean, storage: Storage = localStorage): ConnectorSettings {
  const next = loadConnectorSettings(storage)
  next.enabled[id] = enabled
  saveConnectorSettings(next, storage)
  return next
}
