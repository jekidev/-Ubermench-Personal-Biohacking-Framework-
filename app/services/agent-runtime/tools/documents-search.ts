import { searchDocuments } from '../../../../plugins/longevity/rag/document-index'

export function createDocumentsSearchTool() {
  return {
    name: 'documents.search',
    description: 'Search indexed local lab documents and blood reports (RAG).',
    risk: 'low' as const,
    requiresApproval: false,
    async execute(args: Record<string, unknown>) {
      const query = typeof args.query === 'string' ? args.query : ''
      if (!query.trim()) throw new Error('documents.search requires a query string.')
      const limit = typeof args.limit === 'number' ? args.limit : 8
      const results = searchDocuments(query, limit)
      return results.map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        score: item.score,
        excerpt: item.content.slice(0, 500),
        tags: item.tags,
      }))
    },
  }
}
