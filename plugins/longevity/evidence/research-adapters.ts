export type ResearchProvider = 'pubmed' | 'europe-pmc' | 'crossref' | 'paper-search'

export type ResearchQuery = {
  query: string
  provider: ResearchProvider
}

export type ResearchRequest = {
  provider: ResearchProvider
  url: string
  query: string
  requiresApproval: true
  sources?: string[]
  sciHubEnabled?: false
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

export const PAPER_SEARCH_OPEN_SOURCES = [
  'arxiv',
  'pubmed',
  'biorxiv',
  'medrxiv',
  'europepmc',
  'pmc',
  'openalex',
  'crossref',
] as const

export const paperSearchAdapter: ResearchAdapter = {
  provider: 'paper-search',
  buildRequest({ query }) {
    const normalized = query.trim()
    if (!normalized) throw new Error('Research query cannot be empty.')
    return {
      provider: 'paper-search',
      url: 'mcp://paper-search/search_papers',
      query: normalized,
      requiresApproval: true,
      sources: [...PAPER_SEARCH_OPEN_SOURCES],
      sciHubEnabled: false,
    }
  },
}

export function getResearchAdapter(provider: ResearchProvider): ResearchAdapter {
  switch (provider) {
    case 'pubmed':
      return pubmedAdapter
    case 'europe-pmc':
      return europePmcAdapter
    case 'crossref':
      return crossrefAdapter
    case 'paper-search':
      return paperSearchAdapter
    default: {
      const _never: never = provider
      throw new Error(`Unsupported research provider: ${_never}`)
    }
  }
}
