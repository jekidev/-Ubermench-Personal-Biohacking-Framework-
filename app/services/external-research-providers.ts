export type ResearchProviderId = 'europe-pmc' | 'agent-reach' | 'local-deep-research' | 'paper-qa'

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
]

export function getResearchProvider(id: ResearchProviderId) {
  return RESEARCH_PROVIDER_REGISTRY.find((provider) => provider.id === id)
}
