import { isConnectorEnabled } from '../../plugins/connectors/connector-store'
import type { ConnectorId } from '../../plugins/connectors/types'

export type ResearchProviderId = 'europe-pmc' | 'agent-reach' | 'local-deep-research' | 'paper-qa' | 'paper-search'

const CONNECTOR_LINKED_RESEARCH_PROVIDERS = new Set<ResearchProviderId>([
  'paper-search',
  'paper-qa',
  'local-deep-research',
])

export interface ResearchProviderCapability {
  id: ResearchProviderId
  name: string
  enabled: boolean
  requiresLocalRuntime: boolean
  supportsCitations: boolean
  supportsPrivateDocuments: boolean
}

export const RESEARCH_PROVIDER_REGISTRY: ResearchProviderCapability[] = [
  { id: 'europe-pmc', name: 'Europe PMC', enabled: true, requiresLocalRuntime: false, supportsCitations: true, supportsPrivateDocuments: false },
  { id: 'agent-reach', name: 'Agent-Reach', enabled: false, requiresLocalRuntime: true, supportsCitations: true, supportsPrivateDocuments: false },
  { id: 'local-deep-research', name: 'Local Deep Research', enabled: false, requiresLocalRuntime: true, supportsCitations: true, supportsPrivateDocuments: true },
  { id: 'paper-qa', name: 'PaperQA', enabled: false, requiresLocalRuntime: true, supportsCitations: true, supportsPrivateDocuments: true },
  { id: 'paper-search', name: 'Paper Search MCP', enabled: false, requiresLocalRuntime: true, supportsCitations: true, supportsPrivateDocuments: false },
]

function defaultStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function getResearchProvider(
  id: ResearchProviderId,
  storage: Storage | undefined = defaultStorage(),
): ResearchProviderCapability | undefined {
  const provider = RESEARCH_PROVIDER_REGISTRY.find((entry) => entry.id === id)
  if (!provider) return undefined
  if (!CONNECTOR_LINKED_RESEARCH_PROVIDERS.has(id)) return provider
  const enabled = storage
    ? isConnectorEnabled(id as ConnectorId, storage)
    : typeof localStorage !== 'undefined' && isConnectorEnabled(id as ConnectorId)
  return {
    ...provider,
    enabled,
  }
}

export function listResearchProviders(storage: Storage | undefined = defaultStorage()): ResearchProviderCapability[] {
  return RESEARCH_PROVIDER_REGISTRY.map((provider) => getResearchProvider(provider.id, storage)!)
}
