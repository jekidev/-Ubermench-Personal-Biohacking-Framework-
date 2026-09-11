import type { AgentTool } from '../types'
import { getConnectorStatus } from '../../../../plugins/connectors/connector-runtime'
import { isConnectorEnabled } from '../../../../plugins/connectors/connector-store'
import type { ConnectorId } from '../../../../plugins/connectors/types'
import { getInstalledMcpServer } from '../../../../plugins/llm/mcp/install-store'
import { buildPaperQaPlan, answerPaperQaFromLocalRag, paperQaCitationsToEvidenceNotes, paperQaConnectorOffResult, paperQaFailedResult } from '../../paper-qa'
import { listResearchProviders } from '../../external-research-providers'
import { runResearchWorkflow } from '../../research-workflow'

const RESEARCH_MCP_CONNECTORS: ConnectorId[] = [
  'paper-search',
  'local-deep-research',
  'transcriptor',
]

export function createResearchTools(): AgentTool[] {
  return [
    {
      name: 'research.providers',
      description: 'List literature and deep-research providers with enablement status.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return listResearchProviders().map((provider) => ({
          id: provider.id,
          name: provider.name,
          enabled: provider.enabled,
          requiresLocalRuntime: provider.requiresLocalRuntime,
          supportsCitations: provider.supportsCitations,
        }))
      },
    },
    {
      name: 'research.status',
      description: 'Connector and MCP install status for starred research integrations.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        const connectors = ['paper-search', 'paper-qa', 'local-deep-research', 'transcriptor', 'youtube-rag', 'pdf-inspector'] as const
        const statuses = await Promise.all(connectors.map((id) => getConnectorStatus(id)))
        const mcp = RESEARCH_MCP_CONNECTORS.map((id) => {
          const serverId = id
          const installed = getInstalledMcpServer(serverId)
          return {
            connectorId: id,
            mcpInstalled: Boolean(installed),
            mcpEnabled: Boolean(installed?.enabled),
          }
        })
        return { connectors: statuses, mcp }
      },
    },
    {
      name: 'research.europepmc',
      description: 'Run the built-in Europe PMC bibliographic research workflow.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        const goal = typeof args.goal === 'string' ? args.goal.trim() : ''
        if (!goal) throw new Error('research.europepmc requires a goal string.')
        const pageSize = typeof args.pageSize === 'number' ? args.pageSize : 10
        const result = await runResearchWorkflow({ goal, pageSize })
        return {
          query: result.query,
          hitCount: result.hits.length,
          retrievedAt: result.retrievedAt,
          hits: result.hits.slice(0, pageSize).map((hit) => ({
            id: hit.id,
            title: hit.title,
            journal: hit.journal,
            doi: hit.doi,
            url: hit.url,
          })),
        }
      },
    },
    {
      name: 'research.paperqa.plan',
      description: 'Build an approval-bound PaperQA plan (Sci-Hub disabled).',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        try {
          const question = typeof args.question === 'string' ? args.question : ''
          return buildPaperQaPlan(question)
        } catch (error) {
          return paperQaFailedResult(error instanceof Error ? error.message : 'PaperQA plan failed')
        }
      },
    },
    {
      name: 'research.paperqa.ask',
      description: 'Answer a scientific question using local indexed PDF RAG (PaperQA local-rag contract).',
      risk: 'medium',
      requiresApproval: true,
      async execute(args) {
        if (!isConnectorEnabled('paper-qa')) {
          return paperQaConnectorOffResult()
        }
        try {
          const question = typeof args.question === 'string' ? args.question : ''
          const answer = answerPaperQaFromLocalRag(question)
          if ('emptyIndex' in answer && answer.emptyIndex) return answer
          return {
            ...answer,
            evidenceNotes: paperQaCitationsToEvidenceNotes(answer),
          }
        } catch (error) {
          return paperQaFailedResult(error instanceof Error ? error.message : 'PaperQA ask failed')
        }
      },
    },
  ]
}
