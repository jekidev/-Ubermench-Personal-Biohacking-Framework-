import { describe, expect, it } from 'vitest'
import { mergeObservationsIntoBiomarkers, observationToBiomarker } from './biology-bridge'

describe('biology bridge', () => {
  it('maps longevity observations into biology biomarkers', () => {
    const biomarker = observationToBiomarker({
      id: 'obs-1',
      sourceDocumentId: 'doc-1',
      biomarker: 'CRP',
      value: 1.2,
      unit: 'mg/L',
      collectedAt: '2026-08-25',
      confidence: 0.9,
      locator: 'labs.pdf:page-1',
    })
    expect(biomarker.source).toBe('lab-import')
    expect(mergeObservationsIntoBiomarkers([], [{
      id: 'obs-1',
      sourceDocumentId: 'doc-1',
      biomarker: 'CRP',
      value: 1.2,
      unit: 'mg/L',
      collectedAt: '2026-08-25',
      confidence: 0.9,
    }])).toHaveLength(1)
  })
})
