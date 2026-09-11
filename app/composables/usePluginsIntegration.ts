import { isConnectorEnabled, setConnectorEnabled } from '../../plugins/connectors/connector-store'
import { getConnectorStatus } from '../../plugins/connectors/connector-runtime'
import type { ConnectorId } from '../../plugins/connectors/types'
import { loadExerciseCatalog, searchExercises, type ExerciseRecord } from '../../plugins/longevity/fitness/exercises'
import { LONGEVITY_WATCHLIST, type LongevityWatchlistItem } from '../../plugins/longevity/evidence/watchlist'
import { inspectPdfBytes, type PdfInspection } from '../../plugins/longevity/pdf/pdf-inspector'
import {
  listDomainPlugins,
  listStarredIntegrations,
  type DomainPlugin,
  type StarredIntegration,
} from '../../plugins/plugin-registry'
import { FEARPRIME_INTERVENTION_REGISTRY } from '../../plugins/fearprime/interventions/registry'
import type { GarminBiometricMetric } from '../services/health-adapters/garmin-biometric-schema'
import { REJECTED_BIOMETRIC_PROVIDERS } from '../services/health-adapters/garmin-biometric-schema'

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
  const busy = ref(false)
  const error = ref('')
  const exerciseSearchQuery = ref('')
  const exerciseResults = ref<ExerciseRecord[]>([])
  const watchlistTier = ref<'all' | 'resource' | 'clock' | 'organization' | 'reading'>('all')
  const pdfInspection = ref<PdfInspection | null>(null)

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
    return isConnectorEnabled(integration.connectorId as ConnectorId)
  }

  function setIntegrationConnector(connectorId: string, enabled: boolean) {
    setConnectorEnabled(connectorId as ConnectorId, enabled)
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

  function inspectPdfFile(file: File) {
    error.value = ''
    busy.value = true
    file.arrayBuffer()
      .then((buffer) => {
        pdfInspection.value = inspectPdfBytes(new Uint8Array(buffer))
      })
      .catch((cause) => {
        error.value = cause instanceof Error ? cause.message : 'PDF inspection failed'
        pdfInspection.value = null
      })
      .finally(() => {
        busy.value = false
      })
  }

  function inspectSamplePdf() {
    error.value = ''
    const sample = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')
    pdfInspection.value = inspectPdfBytes(sample)
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
    pdfInspection,
    isIntegrationEnabled,
    setIntegrationConnector,
    refreshConnectorStatus,
    runExerciseSearch,
    inspectPdfFile,
    inspectSamplePdf,
  }
}
