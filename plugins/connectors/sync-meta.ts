import type { ConnectorId } from './types'

const STORAGE_KEY = 'ubermensch:connector-sync-meta:v1'

export type ConnectorSyncMeta = {
  lastSyncAt: Partial<Record<ConnectorId, string>>
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function loadConnectorSyncMeta(storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): ConnectorSyncMeta {
  if (!storage) return { lastSyncAt: {} }
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { lastSyncAt: {} }
    const parsed = JSON.parse(raw) as ConnectorSyncMeta
    return { lastSyncAt: parsed.lastSyncAt ?? {} }
  } catch {
    return { lastSyncAt: {} }
  }
}

export function recordConnectorSync(
  id: ConnectorId,
  at: string = new Date().toISOString(),
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): ConnectorSyncMeta {
  const next = loadConnectorSyncMeta(storage)
  next.lastSyncAt[id] = at
  storage?.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
