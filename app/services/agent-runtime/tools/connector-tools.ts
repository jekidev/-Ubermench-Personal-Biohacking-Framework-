import type { AgentTool } from '../types'
import { listConnectorStatuses } from '../../../../plugins/connectors/connector-runtime'
import { CONNECTOR_REGISTRY, getConnector } from '../../../../plugins/connectors/registry'
import { syncDrivePdfsToRag } from '../../../../plugins/connectors/drive-rag-sync'
import { indexYouTubeUrlsToRag } from '../../../../plugins/connectors/youtube-rag-sync'
import type { ConnectorId } from '../../../../plugins/connectors/types'

export function createConnectorTools(): AgentTool[] {
  return [
    {
      name: 'connector.list',
      description: 'List configured external connectors (Cursor-style integrations).',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        const statuses = await listConnectorStatuses()
        return statuses.map((item) => ({
          id: item.id,
          name: item.name,
          enabled: item.enabled,
          status: item.status,
          capabilities: item.capabilities,
          implementationStatus: item.implementationStatus,
        }))
      },
    },
    {
      name: 'connector.status',
      description: 'Get connection status for a specific connector.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        const id = typeof args.id === 'string' ? args.id : ''
        const connector = getConnector(id)
        if (!connector) throw new Error(`Unknown connector: ${id}`)
        const statuses = await listConnectorStatuses()
        return statuses.find((item) => item.id === id) ?? null
      },
    },
    {
      name: 'connector.catalog',
      description: 'List all available connector definitions and what is missing for full Cursor parity.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        return CONNECTOR_REGISTRY.map((connector) => ({
          id: connector.id,
          name: connector.name,
          category: connector.category,
          transport: connector.transport,
          status: connector.status,
          cursorParity: connector.cursorParity,
          capabilities: connector.capabilities,
          authType: connector.auth.type,
          requiredKeys: connector.auth.envKeys ?? [],
          oauthScopes: connector.auth.oauthScopes ?? [],
          mcpServerId: connector.mcpServerId,
        }))
      },
    },
    {
      name: 'connector.drive.sync',
      description: 'Sync new Google Drive PDFs into the local document RAG index.',
      risk: 'medium',
      requiresApproval: true,
      async execute(args) {
        const folderId = typeof args.folderId === 'string' ? args.folderId : undefined
        const limit = typeof args.limit === 'number' ? args.limit : undefined
        return syncDrivePdfsToRag({ folderId, limit })
      },
    },
    {
      name: 'connector.youtube.index',
      description: 'Fetch YouTube/podcast transcripts and index them into the local document RAG store.',
      risk: 'medium',
      requiresApproval: true,
      async execute(args) {
        const text = typeof args.text === 'string' ? args.text : undefined
        const urls = Array.isArray(args.urls)
          ? args.urls.filter((item): item is string => typeof item === 'string')
          : undefined
        const language = typeof args.language === 'string' ? args.language : undefined
        const force = args.force === true
        return indexYouTubeUrlsToRag({ text, urls, language, force })
      },
    },
  ]
}

export function connectorIdFromToolName(name: string): ConnectorId | null {
  const match = name.match(/^connector\.([a-z0-9-]+)\./)
  return match ? match[1] as ConnectorId : null
}
