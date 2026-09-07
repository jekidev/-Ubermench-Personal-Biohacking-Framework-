import type { ExternalHealthSample } from '../health-data-adapters'
import type { HealthProviderAdapter } from '../health-provider-lifecycle'
import { getSecret, setSecret } from '../secret-vault'
import { mapGarminBiometricsToHealthSamples, type GarminBiometricSample } from './garmin-biometric-schema'
import { hashGarminSampleIdentity, parseGarminWellnessPayload } from './garmin-wellness-payload'
import { loadSyncCursor, saveSyncCursor, type SyncCursor } from './stub-adapters'

export const GARMIN_TOKEN_KEY = 'GARMIN_ACCESS_TOKEN'
export const GARMIN_REFRESH_KEY = 'GARMIN_REFRESH_TOKEN'
export const GARMIN_IMPORT_STORAGE_KEY = 'health-sync:garmin:imported-samples'
export const GARMIN_WELLNESS_BASE_URL = 'https://apis.garmin.com/wellness-api/rest'

const WELLNESS_PATHS = ['dailies', 'sleeps', 'hrv', 'bodyComps', 'pulseOx'] as const

export type GarminOAuthConfig = {
  clientId?: string
  redirectUri?: string
  scopes?: string[]
  wellnessBaseUrl?: string
  fetchImpl?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

type ImportedSampleCache = {
  importedAt: string
  samples: ExternalHealthSample[]
}

export class GarminOAuthAdapter implements HealthProviderAdapter {
  private connected = false

  constructor(private readonly config: GarminOAuthConfig = {}) {}

  async connect(): Promise<void> {
    const token = await this.readToken()
    if (token || this.loadImportedSamples().length) {
      this.connected = true
      return
    }
    if (this.config.clientId) {
      throw new Error('Garmin OAuth requires browser authorization. Complete OAuth in the native shell and store tokens in the secret vault.')
    }
    throw new Error('Garmin is not connected. Import a Wellness JSON export or store an access token in the secret vault.')
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async getStatus() {
    if (this.connected) return 'connected' as const
    const token = await this.readToken()
    return token || this.loadImportedSamples().length ? 'connected' as const : 'disconnected' as const
  }

  async storeTokens(accessToken: string, refreshToken?: string): Promise<void> {
    const token = accessToken.trim()
    if (!token) throw new Error('Garmin access token is required.')
    await setSecret(GARMIN_TOKEN_KEY, token)
    if (refreshToken?.trim()) await setSecret(GARMIN_REFRESH_KEY, refreshToken.trim())
    this.connected = true
  }

  async importWellnessPayload(payload: unknown): Promise<ExternalHealthSample[]> {
    const samples = await this.toHealthSamples(parseGarminWellnessPayload(payload))
    this.saveImportedSamples(samples)
    this.connected = true
    return samples
  }

  async sync(from?: string, to?: string): Promise<ExternalHealthSample[]> {
    if (!this.connected) throw new Error('Garmin is not connected.')

    const token = await this.readToken()
    const fetched = token ? await this.fetchAuthorizedSamples(token, from, to) : []
    const imported = this.loadImportedSamples()
    const merged = dedupeHealthSamples([...imported, ...fetched])
    const filtered = filterSamplesByWindow(merged, from, to, this.loadCursor())

    if (!filtered.length && !imported.length && !fetched.length) {
      throw new Error('No Garmin Wellness samples available. Import a JSON export or authorize the Wellness API.')
    }

    const now = new Date().toISOString()
    const latest = latestRecordedAt(filtered) ?? now
    saveSyncCursor({ provider: 'garmin', lastSyncedAt: now, cursor: latest }, this.storage())
    return filtered
  }

  private async fetchAuthorizedSamples(token: string, from?: string, to?: string): Promise<ExternalHealthSample[]> {
    const fetchImpl = this.config.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined)
    if (!fetchImpl) throw new Error('Garmin Wellness API fetch is not available in this runtime.')

    const toMs = to && Number.isFinite(Date.parse(to)) ? Date.parse(to) : Date.now()
    const fromMs = from && Number.isFinite(Date.parse(from))
      ? Date.parse(from)
      : toMs - 7 * 24 * 60 * 60 * 1000
    const fromSeconds = Math.floor(fromMs / 1000)
    const toSeconds = Math.floor(toMs / 1000)
    const base = (this.config.wellnessBaseUrl ?? GARMIN_WELLNESS_BASE_URL).replace(/\/$/, '')
    const errors: string[] = []
    const samples: ExternalHealthSample[] = []

    for (const path of WELLNESS_PATHS) {
      try {
        const payload = await fetchWellnessCollection(fetchImpl, token, base, path, fromSeconds, toSeconds)
        samples.push(...await this.toHealthSamples(parseGarminWellnessPayload({ [path]: payload })))
      } catch (error) {
        errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    if (!samples.length && errors.length) {
      throw new Error(`Garmin Wellness API sync failed. ${errors.join('; ')}`)
    }
    return samples
  }

  private async toHealthSamples(biometrics: GarminBiometricSample[]): Promise<ExternalHealthSample[]> {
    const mapped = mapGarminBiometricsToHealthSamples(biometrics)
    return Promise.all(mapped.map(async (sample, index) => {
      const biometric = biometrics[index]
      if (!biometric) return sample
      return {
        ...sample,
        metadata: {
          ...sample.metadata,
          adapter: 'garmin-oauth',
          payloadHash: await hashGarminSampleIdentity(biometric),
        },
      }
    }))
  }

  private async readToken(): Promise<string | undefined> {
    try {
      const token = await getSecret(GARMIN_TOKEN_KEY)
      return token?.trim() || undefined
    } catch {
      return undefined
    }
  }

  private loadImportedSamples(): ExternalHealthSample[] {
    const storage = this.storage()
    if (!storage) return []
    try {
      const raw = storage.getItem(GARMIN_IMPORT_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as ImportedSampleCache
      if (!Array.isArray(parsed.samples)) return []
      return parsed.samples.filter((sample) => (
        sample.source === 'garmin'
        && Number.isFinite(sample.value)
        && Number.isFinite(Date.parse(sample.recordedAt))
      ))
    } catch {
      return []
    }
  }

  private saveImportedSamples(samples: ExternalHealthSample[]): void {
    const storage = this.storage()
    if (!storage) return
    const cache: ImportedSampleCache = { importedAt: new Date().toISOString(), samples }
    storage.setItem(GARMIN_IMPORT_STORAGE_KEY, JSON.stringify(cache))
  }

  private loadCursor(): SyncCursor {
    return loadSyncCursor('garmin', this.storage())
  }

  private storage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined {
    if (this.config.storage) return this.config.storage
    if (typeof localStorage === 'undefined') return undefined
    return localStorage
  }
}

async function fetchWellnessCollection(
  fetchImpl: typeof fetch,
  token: string,
  base: string,
  path: string,
  fromSeconds: number,
  toSeconds: number,
): Promise<unknown> {
  const url = new URL(`${base}/${path}`)
  url.searchParams.set('uploadStartTimeInSeconds', String(fromSeconds))
  url.searchParams.set('uploadEndTimeInSeconds', String(toSeconds))
  const response = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`${response.status}`)
  return response.json()
}

function filterSamplesByWindow(
  samples: ExternalHealthSample[],
  from?: string,
  to?: string,
  cursor?: SyncCursor,
): ExternalHealthSample[] {
  const fromMs = from ? Date.parse(from) : Number.NaN
  const toMs = to ? Date.parse(to) : Number.NaN
  const cursorMs = !from && cursor?.cursor ? Date.parse(cursor.cursor) : Number.NaN

  return samples.filter((sample) => {
    const at = Date.parse(sample.recordedAt)
    if (!Number.isFinite(at)) return false
    if (Number.isFinite(fromMs) && at < fromMs) return false
    if (Number.isFinite(toMs) && at > toMs) return false
    if (Number.isFinite(cursorMs) && at < cursorMs) return false
    return true
  })
}

function dedupeHealthSamples(samples: ExternalHealthSample[]): ExternalHealthSample[] {
  const seen = new Map<string, ExternalHealthSample>()
  for (const sample of samples) seen.set(sample.id, sample)
  return [...seen.values()]
}

function latestRecordedAt(samples: ExternalHealthSample[]): string | undefined {
  return samples
    .map((sample) => sample.recordedAt)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort()
    .at(-1)
}
