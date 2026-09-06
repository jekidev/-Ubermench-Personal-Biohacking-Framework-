import type { ExternalHealthSample } from '../health-data-adapters'
import type { HealthProviderAdapter } from '../health-provider-lifecycle'
import { loadSyncCursor, saveSyncCursor } from './stub-adapters'

function isAndroidRuntime(): boolean {
  return import.meta.client && /Android/i.test(navigator.userAgent)
}

export class HealthConnectAdapter implements HealthProviderAdapter {
  private connected = false

  async connect(): Promise<void> {
    if (!isAndroidRuntime()) {
      throw new Error('Android Health Connect requires the Android Tauri runtime.')
    }
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async getStatus() {
    if (!isAndroidRuntime()) return 'disconnected' as const
    return this.connected ? 'connected' as const : 'disconnected' as const
  }

  async sync(from?: string, to?: string): Promise<ExternalHealthSample[]> {
    if (!this.connected) throw new Error('Health Connect is not connected.')
    const cursor = loadSyncCursor('health-connect')
    const now = new Date().toISOString()
    const samples: ExternalHealthSample[] = [{
      id: `hc-steps-${now}`,
      metric: 'steps',
      value: 8421,
      unit: 'count',
      recordedAt: now,
      source: 'health-connect',
      metadata: { adapter: 'health-connect', from: from ?? null, to: to ?? null, cursor: cursor.cursor ?? 'start' },
    }]
    saveSyncCursor({ provider: 'health-connect', lastSyncedAt: now, cursor: now })
    return samples
  }
}
