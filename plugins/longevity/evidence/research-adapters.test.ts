import { describe, expect, it } from 'vitest'
import { crossrefAdapter, europePmcAdapter, getResearchAdapter, pubmedAdapter } from './research-adapters'

describe('research adapters', () => {
  it('builds approval-required PubMed requests', () => {
    const request = pubmedAdapter.buildRequest({ query: 'ApoB cardiovascular mortality', provider: 'pubmed' })
    expect(request.requiresApproval).toBe(true)
    expect(request.url).toContain('pubmed')
  })

  it('builds Europe PMC and Crossref requests without personal payload fields', () => {
    const europe = europePmcAdapter.buildRequest({ query: 'metformin longevity', provider: 'europe-pmc' })
    const crossref = crossrefAdapter.buildRequest({ query: 'taurine aging', provider: 'crossref' })
    expect(europe.url).toContain('europepmc')
    expect(crossref.url).toContain('crossref')
    expect(europe).not.toHaveProperty('healthData')
    expect(crossref).not.toHaveProperty('genotype')
  })

  it('rejects empty searches and returns the correct adapter', () => {
    expect(() => pubmedAdapter.buildRequest({ query: '   ', provider: 'pubmed' })).toThrow('cannot be empty')
    expect(getResearchAdapter('crossref')).toBe(crossrefAdapter)
  })
})
