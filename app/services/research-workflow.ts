import type { EvidencePreview } from '../../plugins/longevity/evidence/live-lookup'
import { buildResearchQuery, searchEuropePMC } from './research-engine'

export interface ResearchWorkflowRequest {
  goal: string
  biomarkers?: string[]
  variants?: string[]
  pageSize?: number
  signal?: AbortSignal
}

export interface ResearchWorkflowResult {
  query: string
  hits: Awaited<ReturnType<typeof searchEuropePMC>>['hits']
  evidenceCandidates: EvidencePreview[]
  retrievedAt: string
}

export async function runResearchWorkflow(request: ResearchWorkflowRequest): Promise<ResearchWorkflowResult> {
  const query = buildResearchQuery(request.goal, request.biomarkers, request.variants)
  const research = await searchEuropePMC(query, request.pageSize ?? 20, request.signal)
  const evidenceCandidates: EvidencePreview[] = research.hits.map((hit) => ({
    metadata: {
      identifier: hit.doi ? `doi:${hit.doi}` : `pmid:${hit.id}`,
      source: 'pubmed',
      title: hit.title,
      authors: hit.authors ? hit.authors.split(',').map((name) => name.trim()).filter(Boolean) : [],
      journal: hit.journal,
      publicationDate: hit.publishedAt,
      doi: hit.doi,
      pmid: /^\d+$/.test(hit.id) ? hit.id : undefined,
      abstract: hit.abstract,
      canonicalUrl: hit.url,
      retrievedAt: research.retrievedAt,
    },
    status: 'candidate',
    evidenceLevel: null,
    reviewRequired: true,
    notes: ['Bibliographic candidate only.', 'Evidence strength requires explicit review.'],
  }))
  return { query, hits: research.hits, evidenceCandidates, retrievedAt: research.retrievedAt }
}
