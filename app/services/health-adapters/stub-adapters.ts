import type { ExternalHealthSample } from '../health-data-adapters'
import type { HealthProviderAdapter } from '../health-provider-lifecycle'

export type SyncCursor = {
  provider: string
  lastSyncedAt?: string
  cursor?: string
}

export class StubHealthProviderAdapter implements HealthProviderAdapter {
  constructor(
    private readonly providerId: string,
    private readonly platformRequired?: string,
  ) {}

  async connect(): Promise<void> {
    if (this.platformRequired) {
      throw new Error(`${this.providerId} requires the ${this.platformRequired} native adapter (not yet connected)`)
    }
  }

  async disconnect(): Promise<void> {}

  async getStatus() {
    return 'disconnected' as const
  }

  async sync(): Promise<ExternalHealthSample[]> {
    throw new Error(`${this.providerId} sync is not configured. Connect the native adapter first.`)
  }
}

export class GarminHealthAdapter extends StubHealthProviderAdapter {
  constructor() {
    super('garmin', 'Garmin OAuth')
  }
}

export class HealthConnectAdapter extends StubHealthProviderAdapter {
  constructor() {
    super('health-connect', 'Android Health Connect')
  }
}

export function loadSyncCursor(
  provider: string,
  storage?: Pick<Storage, 'getItem'>,
): SyncCursor {
  const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
  if (!store) return { provider }
  try {
    const raw = store.getItem(`health-sync:${provider}`)
    if (!raw) return { provider }
    const parsed = JSON.parse(raw) as SyncCursor
    return { ...parsed, provider }
  } catch {
    return { provider }
  }
}

export function saveSyncCursor(
  cursor: SyncCursor,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
  if (!store) return
  store.setItem(`health-sync:${cursor.provider}`, JSON.stringify(cursor))
}
