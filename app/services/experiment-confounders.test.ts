import { describe, expect, it } from 'vitest'
import { filterConfoundersForPhase, summarizeExperimentConfounders } from './experiment-confounders'

describe('experiment confounders', () => {
  it('summarizes categories and high-impact events', () => {
    const result = summarizeExperimentConfounders([
      { id: '1', recordedAt: '2026-08-01T00:00:00Z', category: 'sleep', description: 'short sleep', severity: 2 },
      { id: '2', recordedAt: '2026-08-02T00:00:00Z', category: 'training', description: 'hard session', severity: 1 },
    ])
    expect(result.count).toBe(2)
    expect(result.highImpactCount).toBe(1)
    expect(result.byCategory.sleep).toBe(1)
  })

  it('filters invalid timestamps and phase-matches deterministically', () => {
    const result = filterConfoundersForPhase([
      { id: 'b', recordedAt: '2026-08-03T00:00:00Z', category: 'stress', description: 'stress', severity: 1, phase: 'intervention' },
      { id: 'a', recordedAt: 'bad', category: 'sleep', description: 'bad', severity: 1, phase: 'intervention' },
      { id: 'c', recordedAt: '2026-08-02T00:00:00Z', category: 'sleep', description: 'short sleep', severity: 2 },
    ], 'intervention')
    expect(result.map((item) => item.id)).toEqual(['c', 'b'])
  })
})
