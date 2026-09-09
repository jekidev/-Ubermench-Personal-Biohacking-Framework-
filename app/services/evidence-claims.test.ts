import { describe, expect, it } from 'vitest'
import { extractEvidenceClaims, highestClaimUncertainty } from './evidence-claims'

describe('evidence claims', () => {
  it('extracts a hedged association as high-uncertainty', () => {
    const claims = extractEvidenceClaims({
      title: 'Rapamycin and lifespan',
      summary: 'Rapamycin may be associated with increased lifespan in mice.',
      evidenceLevel: 'animal',
    })
    expect(claims[0]?.polarity).toBe('association')
    expect(claims[0]?.hedges).toContain('may')
    expect(highestClaimUncertainty(claims)).toBe('high')
  })

  it('keeps numeric effects only when they appear in the source text', () => {
    const claims = extractEvidenceClaims({
      title: 'HbA1c trial',
      summary: 'The intervention reduced HbA1c by 0.5% in adults with type 2 diabetes.',
      evidenceLevel: 'randomized-trial',
    })
    expect(claims[0]?.polarity).toBe('decrease')
    expect(claims[0]?.numericEffect).toBe('0.5%')
    expect(claims[0]?.uncertainty).toBe('medium')
    expect(JSON.stringify(claims)).not.toContain('1.2%')
  })

  it('does not invent claims from empty summaries beyond the title', () => {
    const claims = extractEvidenceClaims({ title: 'Untitled protocol paper' })
    expect(claims).toHaveLength(1)
    expect(claims[0]?.source).toBe('title')
    expect(claims[0]?.uncertainty).toBe('high')
  })
})
