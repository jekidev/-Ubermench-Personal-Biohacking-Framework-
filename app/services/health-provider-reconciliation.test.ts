import { describe, expect, it } from 'vitest'
import type { CanonicalObservation } from '~/types/personal-state'
import { reconcileObservations } from './health-provider-reconciliation'

const observation = (id: string, source: string, quality: number, confidence: number, recordedAt = '2026-08-25T10:00:00.000Z'): CanonicalObservation => ({
  id,
  subjectId: 'subject-1',
  observedAt: recordedAt,
  metric: 'heart-rate',
  value: 70,
  unit: 'bpm',
  source: 'wearable',
  sourceRecordId: id,
  quality,
  confidence,
  provenance: { adapter: source, importedAt: '2026-08-25T10:01:00.000Z' },
})

describe('health provider reconciliation', () => {
  it('prefers Android Health Connect when measurements overlap at equal quality', () => {
    const result = reconcileObservations([
      observation('garmin-1', 'garmin', 0.8, 0.8),
      observation('hc-1', 'health-connect', 0.8, 0.8),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('hc-1')
  })

  it('keeps separate observations outside the duplicate window', () => {
    const result = reconcileObservations([
      observation('a', 'health-connect', 1, 1),
      observation('b', 'garmin', 1, 1, '2026-08-25T10:02:01.000Z'),
    ])

    expect(result.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('allows Garmin to be given an explicit source-priority override', () => {
    const result = reconcileObservations([
      observation('hc', 'health-connect', 0.7, 0.7),
      observation('garmin', 'garmin', 1, 1),
    ], { sourcePriority: { garmin: 2 } })

    expect(result[0]?.id).toBe('garmin')
  })
})
