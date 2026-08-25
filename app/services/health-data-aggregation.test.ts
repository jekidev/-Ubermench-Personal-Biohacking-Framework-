import { describe, expect, it } from 'vitest'
import type { CanonicalObservation } from '~/types/personal-state'
import { aggregateObservations, summarizeMissingness } from './health-data-aggregation'

const observation = (id: string, observedAt: string, value: number, quality = 1, confidence = 1): CanonicalObservation => ({
  id,
  subjectId: 'subject-1',
  observedAt,
  metric: 'resting-heart-rate',
  value,
  unit: 'bpm',
  source: 'wearable',
  quality,
  confidence,
})

describe('health data aggregation', () => {
  it('aggregates observations with quality/confidence weighting', () => {
    const result = aggregateObservations([
      observation('a', '2026-08-24T08:00:00Z', 60, 1, 1),
      observation('b', '2026-08-24T12:00:00Z', 80, 0.5, 0.5),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.periodStart).toBe('2026-08-24')
    expect(result[0]?.value).toBeCloseTo(64, 2)
    expect(result[0]?.count).toBe(2)
  })

  it('reports missing periods without treating them as zero values', () => {
    const result = summarizeMissingness(
      [observation('a', '2026-08-24T08:00:00Z', 60)],
      'resting-heart-rate',
      '2026-08-22',
      '2026-08-24',
    )

    expect(result.expectedPeriods).toBe(3)
    expect(result.observedPeriods).toBe(1)
    expect(result.missingPeriods).toBe(2)
    expect(result.coverage).toBeCloseTo(1 / 3)
  })

  it('supports ISO-week buckets', () => {
    const result = aggregateObservations([
      observation('a', '2026-08-24T08:00:00Z', 60),
      observation('b', '2026-08-30T08:00:00Z', 62),
    ], 'week')

    expect(result).toHaveLength(1)
    expect(result[0]?.periodStart).toBe('2026-08-24')
  })
})
