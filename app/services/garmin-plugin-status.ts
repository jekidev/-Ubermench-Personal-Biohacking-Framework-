import type { CanonicalObservation } from '~/types/personal-state'
import { emptyPersonalStateStore, loadPersonalStateStore } from './personal-state-store'
import { garminOAuthStatus } from './health-adapters/garmin-oauth-flow'

export const GARMIN_HEALTH_SYNC_HREF = '/health-sync'
export const GARMIN_PLUGINS_HREF = '/settings?tab=plugins'
export const GARMIN_UNCONFIGURED_MESSAGE =
  'Garmin is unconfigured. On this phone, import Wellness JSON or save a vault token on Health Sync. A Garmin Connect developer client is optional for OAuth — OAuth is not simulated.'

export type GarminPluginStatus = {
  oauthConfigured: boolean
  oauthConnected: boolean
  observationCount: number
  lastObservedAt: string | null
  metrics: string[]
  nextStep: string
  healthSyncHref: typeof GARMIN_HEALTH_SYNC_HREF
  settingsHref: typeof GARMIN_PLUGINS_HREF
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

export function garminStatusNextStep(status: Pick<GarminPluginStatus, 'oauthConfigured' | 'oauthConnected' | 'observationCount'>): string {
  if (!status.oauthConfigured && !status.oauthConnected && status.observationCount === 0) {
    return GARMIN_UNCONFIGURED_MESSAGE
  }
  if (status.oauthConfigured && !status.oauthConnected) {
    return 'OAuth client is saved. JSON import and vault token still work on this phone. Connect Garmin only if the developer redirect works in Chrome — OAuth is not simulated.'
  }
  if (status.oauthConnected && status.observationCount === 0) {
    return 'Token is present. Import Wellness JSON or sync authorized Garmin data on Health Sync.'
  }
  return 'Garmin samples are present. Refresh on Health Sync or Settings → Plugins.'
}

export function withGarminStatusGuidance(
  status: Omit<GarminPluginStatus, 'nextStep' | 'healthSyncHref' | 'settingsHref'> & Partial<Pick<GarminPluginStatus, 'nextStep' | 'healthSyncHref' | 'settingsHref'>>,
): GarminPluginStatus {
  return {
    ...status,
    nextStep: garminStatusNextStep(status),
    healthSyncHref: GARMIN_HEALTH_SYNC_HREF,
    settingsHref: GARMIN_PLUGINS_HREF,
  }
}

export async function loadGarminPluginStatus(
  storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): Promise<GarminPluginStatus> {
  const oauth = await garminOAuthStatus()
  const store = storage ? loadPersonalStateStore(storage) : emptyPersonalStateStore()
  return withGarminStatusGuidance({
    oauthConfigured: oauth.configured,
    oauthConnected: oauth.connected,
    ...summarizeGarminObservations(store.observations),
  })
}
