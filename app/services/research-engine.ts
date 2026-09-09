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

export interface ResearchResult {
  query: string
  hits: ResearchHit[]
  retrievedAt: string
}

interface EuropePMCResult {
  id?: string
  title?: string
  authorString?: string
  journalTitle?: string
  firstPublicationDate?: string
  doi?: string
  abstractText?: string
  source?: string
}

interface EuropePMCResponse {
  resultList?: { result?: EuropePMCResult[] }
}

export async function searchEuropePMC(query: string, pageSize = 20, signal?: AbortSignal): Promise<ResearchResult> {
  const cleanQuery = query.trim().replace(/\s+/g, ' ')
  if (!cleanQuery) return { query: '', hits: [], retrievedAt: new Date().toISOString() }

  const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search')
  url.searchParams.set('query', cleanQuery)
  url.searchParams.set('format', 'json')
  url.searchParams.set('pageSize', String(Math.min(Math.max(Math.floor(pageSize), 1), 100)))
  url.searchParams.set('resultType', 'core')

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Europe PMC search failed: ${response.status}`)
  const body = await response.json() as EuropePMCResponse
  const entries = Array.isArray(body.resultList?.result) ? body.resultList.result : []

  const hits = entries
    .map((entry, index) => {
      const id = entry.id ?? `pmc-${index}`
      return {
        id,
        title: entry.title?.trim() || 'Untitled study',
        authors: entry.authorString?.trim(),
        journal: entry.journalTitle?.trim(),
        publishedAt: entry.firstPublicationDate,
        doi: entry.doi?.trim(),
        url: `https://europepmc.org/article/${entry.source ?? 'MED'}/${encodeURIComponent(id)}`,
        abstract: entry.abstractText?.trim(),
        source: 'europe-pmc' as const,
      }
    })
    .filter((hit) => hit.title !== 'Untitled study' || hit.abstract || hit.doi)

  return { query: cleanQuery, hits, retrievedAt: new Date().toISOString() }
}

function sanitizeLiteratureTerm(value: string): string {
  return value.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
}

/**
 * External literature search query — goal text only.
 * Personal biomarkers and genetics must stay outside public research APIs.
 */
export function buildResearchQuery(goal: string): string {
  const goalTerm = sanitizeLiteratureTerm(goal)
  return goalTerm ? `(${goalTerm})` : ''
}

/** Local-only context for protocol compilation; never sent to external research APIs. */
export function buildLocalResearchContext(goal: string, biomarkers: string[] = [], variants: string[] = []) {
  const goalTerm = sanitizeLiteratureTerm(goal)
  const biomarkerTerms = biomarkers.map(sanitizeLiteratureTerm).filter(Boolean).slice(-8)
  const variantTerms = variants.map(sanitizeLiteratureTerm).filter(Boolean).slice(0, 8)
  const context = [...biomarkerTerms, ...variantTerms]
  return [goalTerm ? `(${goalTerm})` : '', context.length ? `(${context.join(' OR ')})` : ''].filter(Boolean).join(' AND ')
}
