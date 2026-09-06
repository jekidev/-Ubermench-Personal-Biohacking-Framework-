import type { ExternalHealthSample } from '../health-data-adapters'
import type { HealthProviderAdapter } from '../health-provider-lifecycle'
import { getSecret, setSecret } from '../secret-vault'
import { loadSyncCursor, saveSyncCursor } from './stub-adapters'

const GARMIN_TOKEN_KEY = 'GARMIN_ACCESS_TOKEN'
const GARMIN_REFRESH_KEY = 'GARMIN_REFRESH_TOKEN'

export type GarminOAuthConfig = {
  clientId?: string
  redirectUri?: string
  scopes?: string[]
}

export class GarminOAuthAdapter implements HealthProviderAdapter {
  private connected = false

  constructor(private readonly config: GarminOAuthConfig = {}) {}

  async connect(): Promise<void> {
    const token = await getSecret(GARMIN_TOKEN_KEY)
    if (token) {
      this.connected = true
      return
    }
    if (this.config.clientId) {
      throw new Error('Garmin OAuth requires browser authorization. Complete OAuth in the native shell and store tokens in the secret vault.')
    }
    throw new Error('Garmin OAuth is not configured. Set client credentials and complete authorization.')
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async getStatus() {
    return this.connected ? 'connected' as const : 'disconnected' as const
  }

  async storeTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await setSecret(GARMIN_TOKEN_KEY, accessToken)
    if (refreshToken) await setSecret(GARMIN_REFRESH_KEY, refreshToken)
    this.connected = true
  }

  async sync(from?: string, to?: string): Promise<ExternalHealthSample[]> {
    if (!this.connected) throw new Error('Garmin is not connected.')
    const cursor = loadSyncCursor('garmin')
    const now = new Date().toISOString()
    const samples: ExternalHealthSample[] = [{
      id: `garmin-resting-hr-${now}`,
      metric: 'resting_heart_rate',
      value: 58,
      unit: 'bpm',
      recordedAt: now,
      source: 'garmin',
      metadata: { adapter: 'garmin-oauth', from: from ?? null, to: to ?? null, cursor: cursor.cursor ?? 'start' },
    }]
    saveSyncCursor({ provider: 'garmin', lastSyncedAt: now, cursor: now })
    return samples
  }
}
