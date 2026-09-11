import type { SemanticMemoryResult } from '../../../app/services/semantic-memory'
import { searchAgentMemories } from './agent-memory-index'
import { searchDocuments } from './document-index'

export type UnifiedRagKind = 'document' | 'agent-memory'

export interface UnifiedRagHit extends SemanticMemoryResult {
  kind: UnifiedRagKind
}

export interface UnifiedRagSearchOptions {
  includeDocuments?: boolean
  includeAgentMemory?: boolean
  limit?: number
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

export function searchUnifiedRag(
  query: string,
  options: UnifiedRagSearchOptions = {},
): UnifiedRagHit[] {
  const limit = Math.max(1, Math.min(options.limit ?? 8, 24))
  const includeDocuments = options.includeDocuments ?? true
  const includeAgentMemory = options.includeAgentMemory ?? true
  const storage = options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
  const hits: UnifiedRagHit[] = []

  if (includeDocuments && storage) {
    for (const item of searchDocuments(query, limit, storage)) {
      hits.push({ ...item, kind: 'document' })
    }
  }
  if (includeAgentMemory) {
    for (const item of searchAgentMemories(query, limit, storage)) {
      hits.push({ ...item, kind: 'agent-memory' })
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function formatUnifiedRagHits(hits: UnifiedRagHit[]): string {
  if (!hits.length) return ''
  return hits
    .map((hit, index) => {
      const label = hit.kind === 'agent-memory' ? 'Agent memory' : 'Document'
      return `${label} excerpt ${index + 1} (${hit.title}, score ${hit.score.toFixed(2)}):\n${hit.content}`
    })
    .join('\n\n')
}
