export interface ResearchHit {
  id: string
  title: string
  authors?: string
  journal?: string
  publishedAt?: string
  doi?: string
  url?: string
  abstract?: string
  source: 'europe-pmc'
}

export interface ResearchResult { query: string; hits: ResearchHit[]; retrievedAt: string }

function xmlText(value: string, tag: string) {
  const match = value.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return match?.[1]?.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim()
}

export async function searchEuropePMC(query: string, pageSize = 20, signal?: AbortSignal): Promise<ResearchResult> {
  if (!query.trim()) return { query, hits: [], retrievedAt: new Date().toISOString() }
  const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search')
  url.searchParams.set('query', query)
  url.searchParams.set('format', 'xml')
  url.searchParams.set('pageSize', String(Math.min(Math.max(pageSize, 1), 100)))
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Europe PMC search failed: ${response.status}`)
  const xml = await response.text()
  const entries = [...xml.matchAll(/<result>([\s\S]*?)<\/result>/gi)].map((m) => m[1])
  const hits = entries.map((entry, index) => ({
    id: xmlText(entry, 'id') ?? `pmc-${index}`,
    title: xmlText(entry, 'title') ?? 'Untitled study',
    authors: xmlText(entry, 'authorString'),
    journal: xmlText(entry, 'journalTitle'),
    publishedAt: xmlText(entry, 'firstPublicationDate'),
    doi: xmlText(entry, 'doi'),
    url: xmlText(entry, 'fullTextUrlList') ? undefined : undefined,
    abstract: xmlText(entry, 'abstractText'),
    source: 'europe-pmc' as const,
  }))
  return { query, hits, retrievedAt: new Date().toISOString() }
}

export function buildResearchQuery(goal: string, biomarkers: string[] = [], variants: string[] = []) {
  return [goal, ...biomarkers.slice(-8), ...variants.slice(0, 8)].filter(Boolean).join(' ')
}
