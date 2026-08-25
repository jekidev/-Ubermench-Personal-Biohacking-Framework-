import { describe, expect, it } from 'vitest'
import type { CanonicalObservation } from '~/types/personal-state'
import { resolveObservationConflicts, scoreObservationQuality } from './health-data-quality'

const observation = (overrides: Partial<CanonicalObservation> = {}): CanonicalObservation => ({
  id: 'obs-1',
  subjectId: 'subject-1',
  observedAt: '2026-08-25T10:00:00.000Z',
  metric: 'resting-heart-rate',
  value: 55,
  unit: 'bpm',
  source: 'wearable',
  quality: 1,
  confidence: 0.95,
  provenance: { importedAt: '2026-08-25T10:01:00.000Z', adapter: 'oura', sourceVersion: '1' },
  ...overrides,
})

describe('health data quality', () => {
  it('scores well-formed observations as usable', () => {
    const result = scoreObservationQuality(observation())
    expect(result.usable).toBe(true)
    expect(result.score).toBe(1)
    expect(result.reasons).toEqual(['well-formed'])
  })

  it('penalizes weak provenance and confidence', () => {
    const result = scoreObservationQuality(observation({
      quality: 0.4,
      confidence: 0.4,
      provenance: undefined,
    }))
    expect(result.usable).toBe(true)
    expect(result.score).toBeLessThan(1)
    expect(result.reasons).toContain('missing-provenance')
    expect(result.reasons).toContain('low-source-quality')
    expect(result.reasons).toContain('low-confidence')
  })

  it('selects the strongest candidate when sources conflict', () => {
    const weak = observation({ id: 'weak', value: 61, quality: 0.4, confidence: 0.5, provenance: undefined })
    const strong = observation({ id: 'strong', value: 55, quality: 1, confidence: 0.95 })

    const result = resolveObservationConflicts([weak, strong])
    expect(result.observations).toHaveLength(1)
    expect(result.observations[0]?.id).toBe('strong')
    expect(result.conflicts).toEqual([
      expect.objectContaining({ candidates: ['weak', 'strong'], selectedId: 'strong' }),
    ])
  })
})
