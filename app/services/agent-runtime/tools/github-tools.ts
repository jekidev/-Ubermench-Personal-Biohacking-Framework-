import type { AgentTool } from '../types'
import { getInstalledMcpServer } from '../../../../plugins/llm/mcp/install-store'
import { isConnectorEnabled } from '../../../../plugins/connectors/connector-store'
import { getConnectorStatus } from '../../../../plugins/connectors/connector-runtime'
import { fetchStarredReposFromGithub } from '../../../../plugins/starchive/github-api'
import { DEFAULT_GITHUB_USERNAME, summarizeStarchiveCatalog } from '../../../../plugins/starchive/catalog-loader'
import { getSecret } from '../../secret-vault'
import {
  resolveActiveStarchiveCatalog,
  saveStarchiveCatalog,
  searchActiveStarchive,
} from '../../starchive-store'

export function createGitHubTools(): AgentTool[] {
  return [
    {
      name: 'github.status',
      description: 'GitHub connector, MCP install, and starred archive status.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        const token = await getSecret('GITHUB_PERSONAL_ACCESS_TOKEN')
        const username = (await getSecret('GITHUB_USERNAME'))?.trim() || DEFAULT_GITHUB_USERNAME
        const { catalog, source } = resolveActiveStarchiveCatalog()
        const connector = await getConnectorStatus('github')
        const installed = getInstalledMcpServer('github')
        const summary = summarizeStarchiveCatalog(catalog)
        return {
          username,
          tokenConfigured: Boolean(token?.trim()),
          githubConnectorEnabled: isConnectorEnabled('github'),
          connectorStatus: connector.status,
          githubMcpInstalled: Boolean(installed),
          githubMcpEnabled: Boolean(installed?.enabled),
          starchive: {
            source,
            exportedAt: summary.exportedAt,
            repoCount: summary.repoCount,
            topLanguages: summary.topLanguages,
          },
        }
      },
    },
    {
      name: 'github.starchive.search',
      description: 'Search the local GitHub starred repository archive (STARCHIVE snapshot).',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        const query = typeof args.query === 'string' ? args.query : ''
        const language = typeof args.language === 'string' ? args.language : undefined
        const limit = typeof args.limit === 'number' ? args.limit : undefined
        const offset = typeof args.offset === 'number' ? args.offset : undefined
        return searchActiveStarchive({ query, language, limit, offset })
      },
    },
    {
      name: 'github.starchive.refresh',
      description: 'Refresh the starred repository archive from the GitHub API using the configured token.',
      risk: 'medium',
      requiresApproval: true,
      async execute(args) {
        const token = await getSecret('GITHUB_PERSONAL_ACCESS_TOKEN')
        if (!token?.trim()) {
          throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not configured. Add it in Settings → GitHub.')
        }
        const username = typeof args.username === 'string' && args.username.trim()
          ? args.username.trim()
          : ((await getSecret('GITHUB_USERNAME'))?.trim() || DEFAULT_GITHUB_USERNAME)
        const catalog = await fetchStarredReposFromGithub(username, token)
        saveStarchiveCatalog(catalog)
        const summary = summarizeStarchiveCatalog(catalog)
        return {
          username: summary.username,
          exportedAt: summary.exportedAt,
          repoCount: summary.repoCount,
          topLanguages: summary.topLanguages,
        }
      },
    },
    {
      name: 'github.starchive.get',
      description: 'Load the active starred archive snapshot metadata and optional search preview.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        const { catalog, source } = resolveActiveStarchiveCatalog()
        const summary = summarizeStarchiveCatalog(catalog)
        const previewLimit = typeof args.previewLimit === 'number' ? args.previewLimit : 10
        const preview = searchActiveStarchive({ limit: previewLimit })
        return {
          source,
          ...summary,
          preview: preview.items,
        }
      },
    },
  ]
}
