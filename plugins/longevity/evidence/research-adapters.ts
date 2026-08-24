export type ResearchProvider = 'pubmed' | 'europe-pmc' | 'crossref'

export type ResearchQuery = {
  query: string
  provider: ResearchProvider
}

export type ResearchRequest = {
  provider: ResearchProvider
  url: string
  query: string
  requiresApproval: true
}

export interface ResearchAdapter {
  provider: ResearchProvider
  buildRequest(input: ResearchQuery): ResearchRequest
}

function encodeQuery(query: string): string {
  const normalized = query.trim()
  if (!normalized) throw new Error('Research query cannot be empty.')
  return encodeURIComponent(normalized)
}

export const pubmedAdapter: ResearchAdapter = {
  provider: 'pubmed',
  buildRequest({ query }) {
    const q = encodeQuery(query)
    return {
      provider: 'pubmed',
      url: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${q}`,
      query: query.trim(),
      requiresApproval: true,
    }
  },
}

export const europePmcAdapter: ResearchAdapter = {
  provider: 'europe-pmc',
  buildRequest({ query }) {
    const q = encodeQuery(query)
    return {
      provider: 'europe-pmc',
      url: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&query=${q}`,
      query: query.trim(),
      requiresApproval: true,
    }
  },
}

export const crossrefAdapter: ResearchAdapter = {
  provider: 'crossref',
  buildRequest({ query }) {
    const q = encodeQuery(query)
    return {
      provider: 'crossref',
      url: `https://api.crossref.org/works?query.bibliographic=${q}`,
      query: query.trim(),
      requiresApproval: true,
    }
  },
}

export function getResearchAdapter(provider: ResearchProvider): ResearchAdapter {
  return ({ pubmed: pubmedAdapter, 'europe-pmc': europePmcAdapter, crossref: crossrefAdapter })[provider]
}
