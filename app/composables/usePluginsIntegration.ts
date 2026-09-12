import { getConnectorStatus } from '../../plugins/connectors/connector-runtime'
import type { ConnectorId } from '../../plugins/connectors/types'
import { loadExerciseCatalog, searchExercises, type ExerciseRecord } from '../../plugins/longevity/fitness/exercises'
import { LONGEVITY_WATCHLIST, type LongevityWatchlistItem } from '../../plugins/longevity/evidence/watchlist'
import {
  listDomainPlugins,
  listStarredIntegrations,
  type DomainPlugin,
  type StarredIntegration,
} from '../../plugins/plugin-registry'
import { FEARPRIME_INTERVENTION_REGISTRY } from '../../plugins/fearprime/interventions/registry'
import type { GarminBiometricMetric } from '../services/health-adapters/garmin-biometric-schema'
import { REJECTED_BIOMETRIC_PROVIDERS } from '../services/health-adapters/garmin-biometric-schema'
import {
  inspectAndCachePdfBytes,
  inspectSamplePdfAndCache,
} from '../services/pdf-inspect-cache'
import { useConnectorEnablement } from './useConnectorEnablement'
import { useGarminPluginStatus } from './useGarminPluginStatus'
import { usePdfInspectCache } from './usePdfInspectCache'

const GARMIN_METRICS: GarminBiometricMetric[] = [
  'sleep_score',
  'hrv_rmssd',
  'resting_hr',
  'steps',
  'training_load',
  'spo2',
  'body_weight',
  'workout_duration',
]

export function usePluginsIntegration() {
  const { isEnabled, setEnabled } = useConnectorEnablement()
  const { status: garminStatus, refresh: refreshGarminStatus } = useGarminPluginStatus()
  const pdfInspect = usePdfInspectCache()
  const busy = ref(false)
  const error = ref('')
  const exerciseSearchQuery = ref('')
  const exerciseResults = ref<ExerciseRecord[]>([])
  const watchlistTier = ref<'all' | 'resource' | 'clock' | 'organization' | 'reading'>('all')
  const pdfInspection = computed(() => pdfInspect.last.value?.inspection ?? null)
  const pdfInspectionFilename = computed(() => pdfInspect.last.value?.filename ?? '')
  const pdfInspectedAt = computed(() => pdfInspect.last.value?.inspectedAt ?? '')

  const domainPlugins = computed<DomainPlugin[]>(() => listDomainPlugins())
  const starredIntegrations = computed<StarredIntegration[]>(() => listStarredIntegrations())

  const exerciseCatalog = computed(() => loadExerciseCatalog())
  const fearprimeInterventionCount = computed(() => FEARPRIME_INTERVENTION_REGISTRY.length)

  const watchlistItems = computed<LongevityWatchlistItem[]>(() => {
    if (watchlistTier.value === 'all') return LONGEVITY_WATCHLIST
    return LONGEVITY_WATCHLIST.filter((item) => item.tier === watchlistTier.value)
  })

  const garminMetrics = computed(() => GARMIN_METRICS)
  const rejectedProviders = computed(() => [...REJECTED_BIOMETRIC_PROVIDERS])

  function isIntegrationEnabled(integration: StarredIntegration): boolean | null {
    if (!integration.connectorId) return null
    return isEnabled(integration.connectorId as ConnectorId)
  }

  function setIntegrationConnector(connectorId: string, enabled: boolean) {
    setEnabled(connectorId as ConnectorId, enabled)
  }

  async function refreshConnectorStatus(connectorId: ConnectorId) {
    return getConnectorStatus(connectorId)
  }

  function runExerciseSearch() {
    error.value = ''
    try {
      const query = exerciseSearchQuery.value.trim()
      exerciseResults.value = query ? searchExercises(query) : exerciseCatalog.value.exercises.slice(0, 12)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Exercise search failed'
      exerciseResults.value = []
    }
  }

  function applyCachedPdfInspection() {
    pdfInspect.hydrate()
  }

  function inspectPdfFile(file: File) {
    error.value = ''
    busy.value = true
    file.arrayBuffer()
      .then((buffer) => {
        inspectAndCachePdfBytes(new Uint8Array(buffer), file.name)
      })
      .catch((cause) => {
        error.value = cause instanceof Error ? cause.message : 'PDF inspection failed'
      })
      .finally(() => {
        busy.value = false
      })
  }

  function inspectSamplePdf() {
    error.value = ''
    inspectSamplePdfAndCache()
  }

  async function refreshGarminPluginStatus() {
    try {
      await refreshGarminStatus()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Garmin status failed'
    }
  }

  return {
    busy,
    error,
    domainPlugins,
    starredIntegrations,
    exerciseCatalog,
    exerciseSearchQuery,
    exerciseResults,
    fearprimeInterventionCount,
    watchlistTier,
    watchlistItems,
    garminMetrics,
    rejectedProviders,
    garminStatus,
    pdfInspection,
    pdfInspectionFilename,
    pdfInspectedAt,
    isIntegrationEnabled,
    setIntegrationConnector,
    refreshConnectorStatus,
    runExerciseSearch,
    inspectPdfFile,
    inspectSamplePdf,
    applyCachedPdfInspection,
    refreshGarminStatus: refreshGarminPluginStatus,
  }
}
