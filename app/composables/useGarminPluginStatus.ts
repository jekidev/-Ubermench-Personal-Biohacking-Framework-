import { loadGarminPluginStatus, type GarminPluginStatus } from '../services/garmin-plugin-status'

export const GARMIN_PLUGIN_STATUS_STATE_KEY = 'ubermensch-garmin-plugin-status'

export const EMPTY_GARMIN_PLUGIN_STATUS: GarminPluginStatus = {
  oauthConfigured: false,
  oauthConnected: false,
  observationCount: 0,
  lastObservedAt: null,
  metrics: [],
}

export function useGarminPluginStatus() {
  const status = useState<GarminPluginStatus>(GARMIN_PLUGIN_STATUS_STATE_KEY, () => ({
    ...EMPTY_GARMIN_PLUGIN_STATUS,
  }))

  async function refresh() {
    status.value = await loadGarminPluginStatus()
    return status.value
  }

  return { status, refresh }
}
