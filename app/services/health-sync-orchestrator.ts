import type { CanonicalObservation } from '~/types/personal-state'
import type { ExternalHealthSample } from './health-data-adapters'
import { normalizeHealthSamples } from './health-data-adapters'
import { filterSupportedProviderSamples } from './health-provider-capabilities'
import { type HealthConnectionState, type HealthProviderAdapter } from './health-provider-lifecycle'
import { HealthProviderManager, type HealthPlatform } from './health-provider-manager'
import type { HealthProviderId } from './health-provider-registry'

export interface HealthSyncOrchestratorOptions {
  platform: HealthPlatform
  adapters: Partial<Record<HealthProviderId, HealthProviderAdapter>>
  subjectId: string
}

export interface HealthProviderSyncResult {
  provider: HealthProviderId
  state: HealthConnectionState
  samples: ExternalHealthSample[]
  observations: CanonicalObservation[]
}

/**
 * Coordinates the complete provider -> canonical observation boundary.
 *
 * Only configured Garmin and Android Health Connect adapters can enter this
 * path. Provider capability filtering happens before normalization so an
 * adapter cannot accidentally introduce unsupported metrics.
 */
export class HealthSyncOrchestrator {
  private readonly manager: HealthProviderManager

  constructor(private readonly options: HealthSyncOrchestratorOptions) {
    this.manager = new HealthProviderManager({
      platform: options.platform,
      adapters: options.adapters,
    })
  }

  listAvailableProviders(): HealthProviderId[] {
    return this.manager.listAvailableProviders()
  }

  async syncProvider(provider: HealthProviderId, from?: string, to?: string): Promise<HealthProviderSyncResult> {
    const result = await this.manager.sync(provider, from, to)
    const supported = filterSupportedProviderSamples(result.samples)
    const observations = normalizeHealthSamples(supported, this.options.subjectId)

    return {
      provider,
      state: result.state,
      samples: supported,
      observations,
    }
  }

  async syncAvailable(from?: string, to?: string): Promise<HealthProviderSyncResult[]> {
    const providers = this.listAvailableProviders()
    const results: HealthProviderSyncResult[] = []

    for (const provider of providers) {
      results.push(await this.syncProvider(provider, from, to))
    }

    return results
  }
}
