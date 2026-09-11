import type { CanonicalObservation } from '~/types/personal-state'
import { emptyPersonalStateStore, loadPersonalStateStore } from './personal-state-store'
import { garminOAuthStatus } from './health-adapters/garmin-oauth-flow'

export type GarminPluginStatus = {
  oauthConfigured: boolean
  oauthConnected: boolean
  observationCount: number
  lastObservedAt: string | null
  metrics: string[]
}

export function isGarminObservation(observation: CanonicalObservation): boolean {
  return observation.provenance?.adapter === 'garmin' || observation.source === 'garmin'
}

export function summarizeGarminObservations(observations: CanonicalObservation[]): Pick<
  GarminPluginStatus,
  'observationCount' | 'lastObservedAt' | 'metrics'
> {
  const garmin = observations
    .filter(isGarminObservation)
    .slice()
    .sort((left, right) => left.observedAt.localeCompare(right.observedAt))
  const last = garmin.at(-1)
  return {
    observationCount: garmin.length,
    lastObservedAt: last?.observedAt ?? null,
    metrics: [...new Set(garmin.map((item) => item.metric))],
  }
}

export async function loadGarminPluginStatus(
  storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): Promise<GarminPluginStatus> {
  const oauth = await garminOAuthStatus()
  const store = storage ? loadPersonalStateStore(storage) : emptyPersonalStateStore()
  return {
    oauthConfigured: oauth.configured,
    oauthConnected: oauth.connected,
    ...summarizeGarminObservations(store.observations),
  }
}
