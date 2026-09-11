import type { ExternalHealthSample } from '../health-data-adapters'
import type { HealthProviderAdapter } from '../health-provider-lifecycle'
import { isAndroidBrowser, isTauriAndroid } from '../../utils/runtime-platform'
import { HEALTH_CONNECT_BROWSER_MESSAGE } from '../android-fallbacks'
import {
  healthConnectGetPermissionStatus,
  healthConnectIsNativeAvailable,
  healthConnectRequestPermissions,
  healthConnectSyncRecords,
} from '../../../plugins/health-connect/bridge'
import { loadSyncCursor, saveSyncCursor } from './stub-adapters'

export type HealthConnectRuntimeMode = 'native' | 'browser-blocked' | 'unavailable'

export async function detectHealthConnectRuntimeMode(): Promise<HealthConnectRuntimeMode> {
  if (isAndroidBrowser()) return 'browser-blocked'
  if (await isTauriAndroid()) {
    return (await healthConnectIsNativeAvailable()) ? 'native' : 'unavailable'
  }
  return 'unavailable'
}

export class HealthConnectAdapter implements HealthProviderAdapter {
  private connected = false
  private mode: HealthConnectRuntimeMode = 'unavailable'

  async connect(): Promise<void> {
    this.mode = await detectHealthConnectRuntimeMode()
    if (this.mode === 'browser-blocked') {
      throw new Error(HEALTH_CONNECT_BROWSER_MESSAGE)
    }
    if (this.mode !== 'native') {
      throw new Error('Health Connect is not available on this device.')
    }
    const status = await healthConnectRequestPermissions()
    if (status.missing.length) {
      throw new Error(`Health Connect permissions missing: ${status.missing.join(', ')}`)
    }
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async getStatus() {
    this.mode = await detectHealthConnectRuntimeMode()
    if (this.mode === 'browser-blocked') return 'disconnected' as const
    if (this.mode !== 'native') return 'disconnected' as const
    if (!this.connected) return 'disconnected' as const
    try {
      const status = await healthConnectGetPermissionStatus()
      return status.missing.length ? 'disconnected' as const : 'connected' as const
    } catch {
      return 'disconnected' as const
    }
  }

  async sync(from?: string, to?: string): Promise<ExternalHealthSample[]> {
    if (!this.connected) throw new Error('Health Connect is not connected.')
    if (this.mode !== 'native') {
      throw new Error('Health Connect requires the Ubermench Android app.')
    }

    const cursor = loadSyncCursor('health-connect')
    const result = await healthConnectSyncRecords(from ?? cursor.cursor, to)
    const samples: ExternalHealthSample[] = result.samples.map((item) => ({
      id: item.id,
      metric: item.metric,
      value: item.value,
      unit: item.unit,
      recordedAt: item.recordedAt,
      source: 'health-connect',
      metadata: {
        adapter: 'health-connect-native',
        warningCount: result.warnings.length,
        warnings: result.warnings.join(' | '),
      },
    }))

    if (result.cursor) {
      saveSyncCursor({ provider: 'health-connect', lastSyncedAt: new Date().toISOString(), cursor: result.cursor })
    }
    return samples
  }
}
