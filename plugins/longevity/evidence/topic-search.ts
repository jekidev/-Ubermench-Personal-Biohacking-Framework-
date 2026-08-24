import { deduplicateResearchCandidates, type ResearchCandidate, type ResearchSourceAdapter } from './research-source'

export type TopicSearchResult = {
  query: string
  candidates: ResearchCandidate[]
  errors: Array<{ source: string; message: string }>
  retrievedAt: string
}

export async function searchResearchTopic(
  adapters: ResearchSourceAdapter[],
  query: string,
  limit = 10,
): Promise<TopicSearchResult> {
  const errors: TopicSearchResult['errors'] = []
  const batches = await Promise.all(adapters.map(async (adapter) => {
    try {
      return await adapter.search(query, limit)
    } catch (error) {
      errors.push({ source: adapter.source, message: error instanceof Error ? error.message : 'Research provider failed' })
      return []
    }
  }))

  return {
    query,
    candidates: deduplicateResearchCandidates(batches.flat()).slice(0, limit),
    errors,
    retrievedAt: new Date().toISOString(),
  }
}
