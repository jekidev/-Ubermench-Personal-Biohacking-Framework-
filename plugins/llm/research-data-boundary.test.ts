import { describe, expect, it } from 'vitest'
import { toResearchPayload } from './research-data-boundary'

describe('research data boundary', () => {
  it('emits only literature-search fields', () => {
    expect(toResearchPayload('  ApoB mortality  ', 'pubmed')).toEqual({ query: 'ApoB mortality', provider: 'pubmed' })
  })
})
