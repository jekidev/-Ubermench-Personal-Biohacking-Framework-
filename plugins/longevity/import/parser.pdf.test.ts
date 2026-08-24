import { describe, expect, it } from 'vitest'
import { parsePdfExtraction } from './parser'

describe('parsePdfExtraction', () => {
  it('extracts common biomarkers with page provenance', () => {
    const candidates = parsePdfExtraction({
      method: 'native-text',
      pages: [{
        page_number: 2,
        text: 'Prøvedato: 24.08.2026\nApoB 0,82 g/L\nCRP 2,1 mg/L',
      }],
      warnings: [],
    }, 'doc-test', 'laboratoriesvar.pdf')

    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toMatchObject({
      type: 'observation',
      value: {
        biomarker: 'ApoB',
        value: 0.82,
        unit: 'g/L',
        collectedAt: '2026-08-24',
        confidence: 0.75,
        locator: 'laboratoriesvar.pdf:page-2',
      },
    })
  })

  it('preserves low confidence when no reference interval is present', () => {
    const candidates = parsePdfExtraction({
      method: 'native-text',
      pages: [{ page_number: 1, text: 'Creatinine 128 µmol/L' }],
      warnings: [],
    }, 'doc-test', 'labs.pdf')

    expect(candidates[0].type === 'observation' && candidates[0].value.confidence).toBe(0.75)
  })
})
