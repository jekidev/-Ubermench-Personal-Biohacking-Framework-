import type { HealthProviderId } from './health-provider-registry'

export type HealthProviderConnectionState = 'disconnected' | 'connected' | 'error'

export interface ProviderObservationInput {
  metric: string
  value: number
  unit?: string
  observedAt: string
  quality?: number
  confidence?: number
}

export interface NormalizedProviderObservation extends ProviderObservationInput {
  provider: HealthProviderId
  quality: number
  confidence: number
}

export interface HealthProviderSyncResult {
  provider: HealthProviderId
  state: HealthProviderConnectionState
  observations: NormalizedProviderObservation[]
  syncedAt?: string
  error?: string
}

export interface HealthProviderAdapter {
  readonly provider: HealthProviderId
  connect(): Promise<void>
  disconnect(): Promise<void>
  readObservations(from: string, to: string): Promise<ProviderObservationInput[]>
}

function boundedScore(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value as number))
}

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

export function normalizeProviderObservations(
  provider: HealthProviderId,
  observations: ProviderObservationInput[],
): NormalizedProviderObservation[] {
  return observations
    .filter((observation) => observation.metric.trim().length > 0)
    .filter((observation) => Number.isFinite(observation.value))
    .filter((observation) => validTimestamp(observation.observedAt))
    .map((observation) => ({
      ...observation,
      metric: observation.metric.trim(),
      provider,
      quality: boundedScore(observation.quality, 0.75),
      confidence: boundedScore(observation.confidence, 0.75),
    }))
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.metric.localeCompare(b.metric))
}

export async function syncHealthProvider(
  adapter: HealthProviderAdapter,
  from: string,
  to: string,
): Promise<HealthProviderSyncResult> {
  if (!validTimestamp(from) || !validTimestamp(to) || Date.parse(from) > Date.parse(to)) {
    return { provider: adapter.provider, state: 'error', observations: [], error: 'Invalid sync window' }
  }

  let connected = false
  try {
    await adapter.connect()
    connected = true
    const raw = await adapter.readObservations(from, to)
    return {
      provider: adapter.provider,
      state: 'connected',
      observations: normalizeProviderObservations(adapter.provider, raw),
      syncedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      provider: adapter.provider,
      state: 'error',
      observations: [],
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    if (connected) {
      try {
        await adapter.disconnect()
      } catch {
        // Disconnect failures must not replace the primary sync result.
      }
    }
  }
}
