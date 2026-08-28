import type { CanonicalObservation } from '~/types/personal-state'
import type { HealthProviderSyncResult, HealthSyncOrchestrator } from './health-sync-orchestrator'
import {
  appendCanonicalObservations,
  loadPersonalStateStore,
  savePersonalStateStore,
  type PersonalStateStore,
} from './personal-state-store'

export interface PersistedHealthSyncResult {
  results: HealthProviderSyncResult[]
  observations: CanonicalObservation[]
  store: PersonalStateStore
}

type HealthSyncSource = Pick<HealthSyncOrchestrator, 'syncAvailable'>

/**
 * Persist the canonical output of a provider sync without allowing raw provider
 * records to bypass the canonical observation boundary.
 *
 * The operation is idempotent because the personal-state store is keyed by
 * canonical observation id.
 */
export async function syncAndPersistHealth(
  orchestrator: HealthSyncSource,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  from?: string,
  to?: string,
): Promise<PersistedHealthSyncResult> {
  const results = await orchestrator.syncAvailable(from, to)
  const observations = results.flatMap((result) => result.observations)
  const current = loadPersonalStateStore(storage)
  const store = appendCanonicalObservations(current, observations)
  savePersonalStateStore(storage, store)

  return { results, observations, store }
}
