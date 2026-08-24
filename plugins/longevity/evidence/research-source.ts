export type ResearchSource = 'pubmed' | 'crossref' | 'europe-pmc'

export type ResearchCandidate = {
  source: ResearchSource
  sourceId: string
  title: string
  authors: string[]
  journal?: string
  publicationDate?: string
  doi?: string
  pmid?: string
  canonicalUrl?: string
  retrievedAt: string
}

export type ResearchSourceAdapter = {
  source: ResearchSource
  search(query: string, limit?: number): Promise<ResearchCandidate[]>
  resolve(identifier: string): Promise<ResearchCandidate | null>
}

export function normalizeResearchIdentifier(identifier: string): { type: 'doi' | 'pmid' | 'url' | 'query'; value: string } {
  const value = identifier.trim()
  const doi = value.replace(/^https?:\/\/(doi\.org\/)?/i, '').replace(/^doi:/i, '').trim()
  if (/^10\.\d{4,9}\/\S+$/i.test(doi)) return { type: 'doi', value: doi.toLowerCase() }
  const pmid = value.replace(/^pmid:/i, '').trim()
  if (/^\d{1,10}$/.test(pmid)) return { type: 'pmid', value: pmid }
  if (/^https?:\/\//i.test(value)) return { type: 'url', value }
  return { type: 'query', value }
}

export function researchCandidateKey(candidate: ResearchCandidate): string {
  if (candidate.doi) return `doi:${candidate.doi.toLowerCase()}`
  if (candidate.pmid) return `pmid:${candidate.pmid}`
  return `${candidate.source}:${candidate.sourceId}`
}

export function deduplicateResearchCandidates(candidates: ResearchCandidate[]): ResearchCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = researchCandidateKey(candidate)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
