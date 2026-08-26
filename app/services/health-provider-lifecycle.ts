import type { ExternalHealthSample } from './health-data-adapters'
import type { HealthProviderId } from './health-provider-registry'

export type HealthConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface HealthConnectionState {
  provider: HealthProviderId
  status: HealthConnectionStatus
  connectedAt?: string
  lastSyncAt?: string
  lastError?: string
}

export interface HealthProviderAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>
  getStatus(): Promise<HealthConnectionStatus>
  sync(from?: string, to?: string): Promise<ExternalHealthSample[]>
}

export interface HealthProviderLifecycle {
  readonly provider: HealthProviderId
  getState(): HealthConnectionState
  connect(): Promise<HealthConnectionState>
  disconnect(): Promise<HealthConnectionState>
  sync(from?: string, to?: string): Promise<{ state: HealthConnectionState; samples: ExternalHealthSample[] }>
}

function now(): string {
  return new Date().toISOString()
}

function isValidTimestamp(value: string): boolean {
  return Number.isFinite(new Date(value).getTime())
}

/**
 * Provider lifecycle is deliberately transport-agnostic. Garmin OAuth and
 * Android Health Connect are implemented by platform adapters; this layer
 * owns deterministic connection state, error handling and sync boundaries.
 */
export class DefaultHealthProviderLifecycle implements HealthProviderLifecycle {
  private state: HealthConnectionState

  constructor(
    public readonly provider: HealthProviderId,
    private readonly adapter: HealthProviderAdapter,
  ) {
    this.state = { provider, status: 'disconnected' }
  }

  getState(): HealthConnectionState {
    return { ...this.state }
  }

  async connect(): Promise<HealthConnectionState> {
    this.state = { provider: this.provider, status: 'connecting' }
    try {
      await this.adapter.connect()
      this.state = { provider: this.provider, status: 'connected', connectedAt: now() }
    } catch (error) {
      this.state = {
        provider: this.provider,
        status: 'error',
        lastError: error instanceof Error ? error.message : String(error),
      }
    }
    return this.getState()
  }

  async disconnect(): Promise<HealthConnectionState> {
    try {
      await this.adapter.disconnect()
    } finally {
      this.state = { provider: this.provider, status: 'disconnected' }
    }
    return this.getState()
  }

  async sync(from?: string, to?: string): Promise<{ state: HealthConnectionState; samples: ExternalHealthSample[] }> {
    if (this.state.status !== 'connected') {
      return { state: this.getState(), samples: [] }
    }
    if (from && !isValidTimestamp(from)) throw new Error('Invalid sync start timestamp')
    if (to && !isValidTimestamp(to)) throw new Error('Invalid sync end timestamp')
    if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
      throw new Error('Sync start timestamp must not be after end timestamp')
    }

    try {
      const samples = (await this.adapter.sync(from, to)).filter((sample) =>
        Number.isFinite(sample.value) && isValidTimestamp(sample.recordedAt),
      )
      this.state = { ...this.state, status: 'connected', lastSyncAt: now(), lastError: undefined }
      return { state: this.getState(), samples }
    } catch (error) {
      this.state = {
        ...this.state,
        status: 'error',
        lastError: error instanceof Error ? error.message : String(error),
      }
      return { state: this.getState(), samples: [] }
    }
  }
}
