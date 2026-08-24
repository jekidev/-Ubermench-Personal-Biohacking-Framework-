import { describe, expect, it } from 'vitest'
import { buildPdfReviewSummary, parsePdfLabBlocks } from './pdf-lab-engine'

describe('PDF lab candidate extraction', () => {
  it('extracts common biomarker values and reference ranges', () => {
    const candidates = parsePdfLabBlocks([
      { page: 2, confidence: 0.98, text: 'CRP 3,2 mg/L 0 - 5' },
      { page: 2, confidence: 0.96, text: 'ApoB 0,82 g/L 0,60 - 1,00' },
      { page: 3, confidence: 0.95, text: 'Creatinine 128 µmol/L 60 - 105' },
    ])

    expect(candidates.map((item) => item.biomarker)).toEqual(['crp', 'apoB', 'creatinine'])
    expect(candidates[0].value).toBe(3.2)
    expect(candidates[1].referenceLow).toBe(0.6)
    expect(candidates[1].referenceHigh).toBe(1)
    expect(candidates[2].page).toBe(3)
  })

  it('does not silently trust missing units or ranges', () => {
    const candidates = parsePdfLabBlocks([{ page: 1, text: 'CRP 4' }])
    expect(candidates[0].warnings).toContain('Unit could not be confidently extracted')
    expect(candidates[0].warnings).toContain('Laboratory reference interval not confidently extracted')
    expect(candidates[0].confidence).toBeLessThan(0.9)
  })

  it('marks uncertain extraction for review', () => {
    const summary = buildPdfReviewSummary(parsePdfLabBlocks([
      { page: 1, confidence: 0.7, text: 'HbA1c 34 mmol/mol 20 - 42' },
    ]))
    expect(summary.requiresReview).toBe(true)
    expect(summary.pages).toEqual([1])
  })
})
