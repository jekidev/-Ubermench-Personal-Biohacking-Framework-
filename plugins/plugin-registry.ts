import fearprimeManifest from './fearprime/manifest.json'
import longevityManifest from './longevity/manifest.json'

export type DomainPlugin = {
  id: string
  name: string
  version: string
  description: string
  route: string
  clinicalMode: boolean
  researchMode: boolean
}

export type StarredIntegrationKind = 'domain-module' | 'connector' | 'settings-delegated'

export type StarredIntegration = {
  id: string
  name: string
  description: string
  source: string
  modulePath: string
  kind: StarredIntegrationKind
  settingsTab?: 'github' | 'memory' | 'research' | 'connectors' | 'plugins'
  connectorId?: string
}

export const DOMAIN_PLUGINS: DomainPlugin[] = [
  {
    id: fearprimeManifest.id,
    name: fearprimeManifest.name,
    version: fearprimeManifest.version,
    description: fearprimeManifest.description,
    route: '/fearprime',
    clinicalMode: fearprimeManifest.clinicalMode,
    researchMode: fearprimeManifest.researchMode,
  },
  {
    id: longevityManifest.id,
    name: longevityManifest.name,
    version: longevityManifest.version,
    description: longevityManifest.description,
    route: '/longevity',
    clinicalMode: longevityManifest.clinicalMode,
    researchMode: longevityManifest.researchMode,
  },
]

/** Approved adapters from jekidev/stararchive — not wholesale merges. */
export const STARRED_INTEGRATIONS: StarredIntegration[] = [
  {
    id: 'paper-search',
    name: 'Paper Search MCP',
    description: 'arXiv, PubMed, bioRxiv, OpenAlex literature search via uvx paper-search-mcp.',
    source: 'jekidev/stararchive',
    modulePath: 'plugins/connectors + plugins/llm/mcp/servers.ts',
    kind: 'settings-delegated',
    settingsTab: 'research',
    connectorId: 'paper-search',
  },
  {
    id: 'paper-qa',
    name: 'PaperQA',
    description: 'Citation RAG contract over local lab PDFs — local sidecar only.',
    source: 'jekidev/stararchive',
    modulePath: 'app/services/paper-qa.ts',
    kind: 'settings-delegated',
    settingsTab: 'research',
    connectorId: 'paper-qa',
  },
  {
    id: 'local-deep-research',
    name: 'Local Deep Research',
    description: 'Optional ldr-mcp connector for cited deep-research summaries.',
    source: 'jekidev/stararchive',
    modulePath: 'plugins/connectors + .cursor/skills/local-deep-research',
    kind: 'settings-delegated',
    settingsTab: 'research',
    connectorId: 'local-deep-research',
  },
  {
    id: 'exercise-catalog',
    name: 'Exercise catalog',
    description: 'MIT metadata exercise catalog for longevity fitness (no Gym visual media).',
    source: 'hasaneyldrm/exercises-dataset',
    modulePath: 'plugins/longevity/fitness/exercises.catalog.json',
    kind: 'domain-module',
  },
  {
    id: 'longevity-watchlist',
    name: 'Longevity watchlist',
    description: 'Curated geroscience resources from awesome-longevity.',
    source: 'atilatech/awesome-longevity',
    modulePath: 'plugins/longevity/evidence/watchlist.ts',
    kind: 'domain-module',
  },
  {
    id: 'garmin-biometric',
    name: 'Garmin biometric map',
    description: 'Garmin-only biometric schema — rejects Oura, Whoop, Apple Health, etc.',
    source: 'jekidev/stararchive',
    modulePath: 'app/services/health-adapters/garmin-biometric-schema.ts',
    kind: 'domain-module',
  },
  {
    id: 'pdf-inspector',
    name: 'PDF inspector',
    description: 'Classifies lab PDFs as text vs scanned for OCR routing in the import pipeline.',
    source: 'jekidev/stararchive',
    modulePath: 'plugins/longevity/pdf/pdf-inspector.ts',
    kind: 'connector',
    connectorId: 'pdf-inspector',
    settingsTab: 'plugins',
  },
]

export function listDomainPlugins(): DomainPlugin[] {
  return [...DOMAIN_PLUGINS]
}

export function listStarredIntegrations(): StarredIntegration[] {
  return [...STARRED_INTEGRATIONS]
}

export function getDomainPlugin(id: string): DomainPlugin | undefined {
  const trimmed = id.trim()
  if (!trimmed) throw new Error('Plugin id is required')
  return DOMAIN_PLUGINS.find((plugin) => plugin.id === trimmed)
}

export function getStarredIntegration(id: string): StarredIntegration | undefined {
  const trimmed = id.trim()
  if (!trimmed) throw new Error('Integration id is required')
  return STARRED_INTEGRATIONS.find((integration) => integration.id === trimmed)
}
