import { describe, expect, it } from 'vitest'
import { buildMitoOverlay, MITO_COMPLEX_MAP } from './mito-complex-map'

describe('mito complex map', () => {
  it('defines all five respiratory complexes', () => {
    expect(MITO_COMPLEX_MAP.map((node) => node.complex)).toEqual(['I', 'II', 'III', 'IV', 'V'])
  })

  it('highlights complexes from gene inputs', () => {
    const overlay = buildMitoOverlay({ genes: ['NDUFS1'] })
    expect(overlay.highlightedComplexes).toContain('I')
    expect(overlay.highlightedGenes).toContain('NDUFS1')
  })
})
