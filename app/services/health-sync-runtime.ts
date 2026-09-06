import type { ExternalHealthSample } from './health-data-adapters'
import type { HealthProviderId } from './health-provider-registry'
import { HealthSyncOrchestrator } from './health-sync-orchestrator'
import { GarminHealthAdapter, HealthConnectAdapter } from './health-adapters/stub-adapters'

export function createHealthSyncOrchestrator(subjectId = 'self'): HealthSyncOrchestrator {
  const platform = import.meta.client && /Android/i.test(navigator.userAgent) ? 'android' : 'web'
  return new HealthSyncOrchestrator({
    platform,
    subjectId,
    adapters: {
      garmin: new GarminHealthAdapter(),
      'health-connect': new HealthConnectAdapter(),
    },
  })
}

export async function syncHealthProvider(provider: HealthProviderId, subjectId = 'self'): Promise<{ samples: ExternalHealthSample[]; error?: string }> {
  const orchestrator = createHealthSyncOrchestrator(subjectId)
  try {
    const result = await orchestrator.syncProvider(provider)
    return { samples: result.samples, error: result.state.lastError }
  } catch (error) {
    return { samples: [], error: error instanceof Error ? error.message : String(error) }
  }
}
