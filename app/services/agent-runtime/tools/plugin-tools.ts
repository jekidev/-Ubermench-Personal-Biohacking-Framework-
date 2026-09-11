import type { AgentTool } from '../types'
import { getConnectorStatus } from '../../../../plugins/connectors/connector-runtime'
import { isConnectorEnabled } from '../../../../plugins/connectors/connector-store'
import type { ConnectorId } from '../../../../plugins/connectors/types'
import { loadExerciseCatalog, searchExercises } from '../../../../plugins/longevity/fitness/exercises'
import { listWatchlistByTier, LONGEVITY_WATCHLIST, type WatchlistTier } from '../../../../plugins/longevity/evidence/watchlist'
import {
  listDomainPlugins,
  listStarredIntegrations,
} from '../../../../plugins/plugin-registry'
import { FEARPRIME_INTERVENTION_REGISTRY } from '../../../../plugins/fearprime/interventions/registry'
import { REJECTED_BIOMETRIC_PROVIDERS } from '../../health-adapters/garmin-biometric-schema'
import { loadGarminPluginStatus } from '../../garmin-plugin-status'

const PLUGIN_CONNECTORS: ConnectorId[] = ['pdf-inspector']

export function createPluginTools(): AgentTool[] {
  return [
    {
      name: 'plugins.status',
      description: 'List domain plugins (Fearprime, Longevity) and approved starred integration modules.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        const connectors = await Promise.all(
          PLUGIN_CONNECTORS.map(async (id) => ({
            id,
            enabled: isConnectorEnabled(id),
            status: await getConnectorStatus(id),
          })),
        )
        const catalog = loadExerciseCatalog()
        return {
          domainPlugins: listDomainPlugins(),
          starredIntegrations: listStarredIntegrations().map((integration) => ({
            id: integration.id,
            name: integration.name,
            kind: integration.kind,
            settingsTab: integration.settingsTab ?? null,
            connectorId: integration.connectorId ?? null,
            enabled: integration.connectorId
              ? isConnectorEnabled(integration.connectorId as ConnectorId)
              : null,
          })),
          stats: {
            fearprimeInterventions: FEARPRIME_INTERVENTION_REGISTRY.length,
            exerciseCatalogCount: catalog.count,
            watchlistCount: LONGEVITY_WATCHLIST.length,
            rejectedBiometricProviders: REJECTED_BIOMETRIC_PROVIDERS,
          },
          connectors,
        }
      },
    },
    {
      name: 'plugins.exercises.search',
      description: 'Search the local MIT-metadata exercise catalog (longevity fitness plugin).',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        const query = typeof args.query === 'string' ? args.query.trim() : ''
        if (!query) throw new Error('plugins.exercises.search requires a query string.')
        const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 50) : 12
        return searchExercises(query).slice(0, limit).map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          equipment: exercise.equipment,
          target: exercise.target,
          muscleGroup: exercise.muscleGroup,
        }))
      },
    },
    {
      name: 'plugins.watchlist.list',
      description: 'List the local longevity geroscience watchlist (awesome-longevity). Optional tier filter: resource, clock, organization, reading.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        const tier = typeof args.tier === 'string' ? args.tier.trim() : ''
        if (!tier) return LONGEVITY_WATCHLIST
        const allowed: WatchlistTier[] = ['resource', 'clock', 'organization', 'reading']
        if (!allowed.includes(tier as WatchlistTier)) {
          throw new Error('plugins.watchlist.list tier must be resource, clock, organization, or reading.')
        }
        return listWatchlistByTier(tier as WatchlistTier)
      },
    },
    {
      name: 'plugins.garmin.schema',
      description: 'Show Garmin-only biometric metrics and rejected health providers.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return {
          provider: 'garmin',
          metrics: ['sleep_score', 'hrv_rmssd', 'resting_hr', 'steps', 'training_load', 'spo2', 'body_weight', 'workout_duration'],
          rejectedProviders: REJECTED_BIOMETRIC_PROVIDERS,
        }
      },
    },
    {
      name: 'plugins.garmin.status',
      description: 'Garmin OAuth configuration plus persisted wearable observations mapped from Garmin.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return loadGarminPluginStatus()
      },
    },
  ]
}
