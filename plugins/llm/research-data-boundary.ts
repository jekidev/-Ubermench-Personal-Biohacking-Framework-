export type ResearchPayload = {
  query: string
  provider: 'pubmed' | 'crossref' | 'europe-pmc'
}

/**
 * Research requests deliberately accept only literature-search fields.
 * Personal biomarker, DNA and health records must stay outside this boundary.
 */
export function toResearchPayload(query: string, provider: ResearchPayload['provider']): ResearchPayload {
  return { query: query.trim(), provider }
}
