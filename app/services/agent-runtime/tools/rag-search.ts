import { searchUnifiedRag } from '../../../../plugins/longevity/rag/unified-search'
import type { AgentTool } from '../types'

export function createRagSearchTool(): AgentTool {
  return {
    name: 'rag.search',
    description: 'Search indexed local documents and persisted agent memories in one unified RAG query.',
    risk: 'low',
    requiresApproval: false,
    async execute(args) {
      const query = typeof args.query === 'string' ? args.query : ''
      if (!query.trim()) throw new Error('rag.search requires a query string.')
      const limit = typeof args.limit === 'number' ? args.limit : 8
      const includeDocuments = args.includeDocuments !== false
      const includeAgentMemory = args.includeAgentMemory !== false
      const results = searchUnifiedRag(query, { limit, includeDocuments, includeAgentMemory })
      return results.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        source: item.source,
        score: item.score,
        excerpt: item.content.slice(0, 500),
        tags: item.tags,
      }))
    },
  }
}
