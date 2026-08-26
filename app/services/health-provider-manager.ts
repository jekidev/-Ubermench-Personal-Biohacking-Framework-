import type { ExternalHealthSample } from './health-data-adapters'
import { getHealthProvider, type HealthProviderId } from './health-provider-registry'
import {
  DefaultHealthProviderLifecycle,
  type HealthConnectionState,
  type HealthProviderAdapter,
  type HealthProviderLifecycle,
} from './health-provider-lifecycle'

export type HealthPlatform = 'android' | 'desktop' | 'web'

export interface HealthProviderManagerOptions {
  platform: HealthPlatform
  adapters: Partial<Record<HealthProviderId, HealthProviderAdapter>>
}

/**
 * Single entry point for health integrations.
 *
 * The manager intentionally exposes only the two product-supported providers:
 * Garmin and Android Health Connect. Missing native/platform adapters are
 * reported as an explicit error instead of silently falling back to another
 * provider or pretending that data is available.
 */
export class HealthProviderManager {
  private readonly lifecycles = new Map<HealthProviderId, HealthProviderLifecycle>()

  constructor(private readonly options: HealthProviderManagerOptions) {
    for (const provider of ['health-connect', 'garmin'] as const) {
      const capability = getHealthProvider(provider)
      const adapter = options.adapters[provider]
      if (!capability || !adapter) continue

      if (capability.platform === 'android' && options.platform !== 'android') continue

      this.lifecycles.set(provider, new DefaultHealthProviderLifecycle(provider, adapter))
    }
  }

  listAvailableProviders(): HealthProviderId[] {
    return [...this.lifecycles.keys()]
  }

  getState(provider: HealthProviderId): HealthConnectionState {
    return this.requireLifecycle(provider).getState()
  }

  async connect(provider: HealthProviderId): Promise<HealthConnectionState> {
    return this.requireLifecycle(provider).connect()
  }

  async disconnect(provider: HealthProviderId): Promise<HealthConnectionState> {
    return this.requireLifecycle(provider).disconnect()
  }

  async sync(
    provider: HealthProviderId,
    from?: string,
    to?: string,
  ): Promise<{ state: HealthConnectionState; samples: ExternalHealthSample[] }> {
    return this.requireLifecycle(provider).sync(from, to)
  }

  private requireLifecycle(provider: HealthProviderId): HealthProviderLifecycle {
    const lifecycle = this.lifecycles.get(provider)
    if (lifecycle) return lifecycle

    const capability = getHealthProvider(provider)
    if (!capability) throw new Error(`Unsupported health provider: ${provider}`)

    if (capability.platform === 'android' && this.options.platform !== 'android') {
      throw new Error(`${capability.name} is only available on Android`)
    }

    throw new Error(`${capability.name} adapter is not configured`)
  }
}
