import { describe, expect, it } from 'vitest'
import { buildEvidenceStateTimeline } from './evidence-state-timeline'

describe('evidence-state timeline', () => {
  it('merges state and evidence on a shared time axis without inventing causality', () => {
    const result = buildEvidenceStateTimeline({
      events: [
        { id: 'b2', kind: 'biomarker', recordedAt: '2026-08-10T00:00:00.000Z', label: 'CRP', value: 2, unit: 'mg/L', quality: 'measured' },
        { id: 'b1', kind: 'biomarker', recordedAt: '2026-08-01T00:00:00.000Z', label: 'CRP', value: 1, unit: 'mg/L', quality: 'measured' },
      ],
      evidence: [
        { id: 'doi:1', title: 'CRP review', retrievedAt: '2026-08-05T00:00:00.000Z', publishedAt: '2025-01-01T00:00:00.000Z' },
      ],
    })

    expect(result.map((item) => item.id)).toEqual(['doi:1', 'b1', 'b2'])
    expect(result[0]?.lane).toBe('evidence')
    expect(result[0]?.detail).toBe('published')
    expect(result.some((item) => /caus/i.test(item.label))).toBe(false)
  })

  it('falls back to retrieval time and drops invalid timestamps', () => {
    const result = buildEvidenceStateTimeline({
      events: [
        { id: 'bad', kind: 'biomarker', recordedAt: 'nope', label: 'CRP', value: 9, unit: 'mg/L', quality: 'measured' },
        { id: 'ok', kind: 'sleep', recordedAt: '2026-08-02T00:00:00.000Z', label: 'Sleep duration', value: 400, unit: 'min', quality: 'measured' },
      ],
      evidence: [
        { id: 'e1', title: 'Sleep paper', retrievedAt: '2026-08-03T00:00:00.000Z' },
        { id: 'e-bad', title: 'Broken', retrievedAt: 'not-a-date' },
      ],
    })

    expect(result.map((item) => item.id)).toEqual(['ok', 'e1'])
    expect(result[1]?.detail).toBe('retrieved')
  })
})
