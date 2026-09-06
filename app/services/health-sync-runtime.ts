import type { ExternalHealthSample } from './health-data-adapters'
import type { HealthProviderId } from './health-provider-registry'
import { HealthSyncOrchestrator } from './health-sync-orchestrator'
import { GarminOAuthAdapter } from './health-adapters/garmin-oauth-adapter'
import { HealthConnectAdapter } from './health-adapters/health-connect-adapter'
import { withHealthSyncRetry } from './health-sync-retry'
import { syncAndPersistHealth } from './health-sync-persistence'

export function createHealthSyncOrchestrator(subjectId = 'self'): HealthSyncOrchestrator {
  const platform = import.meta.client && /Android/i.test(navigator.userAgent) ? 'android' : 'web'
  return new HealthSyncOrchestrator({
    platform,
    subjectId,
    adapters: {
      garmin: new GarminOAuthAdapter(),
      'health-connect': new HealthConnectAdapter(),
    },
  })
}

export async function syncHealthProvider(provider: HealthProviderId, subjectId = 'self'): Promise<{ samples: ExternalHealthSample[]; error?: string }> {
  const orchestrator = createHealthSyncOrchestrator(subjectId)
  try {
    const result = await withHealthSyncRetry(() => orchestrator.syncProvider(provider))
    return { samples: result.samples, error: result.state.lastError }
  } catch (error) {
    return { samples: [], error: error instanceof Error ? error.message : String(error) }
  }
}

export async function syncAndPersistAllHealth(subjectId = 'self') {
  const orchestrator = createHealthSyncOrchestrator(subjectId)
  if (!import.meta.client) {
    return { results: [], observations: [], store: null }
  }
  return syncAndPersistHealth(orchestrator, window.localStorage)
}
