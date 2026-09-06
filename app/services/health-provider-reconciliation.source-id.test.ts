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
  it('deduplicates exact source record ids even outside the time window', () => {
    const result = reconcileObservations([
      observation('shared-id', 'garmin', 0.7, 0.7),
      observation('shared-id', 'health-connect', 0.9, 0.9, '2026-08-25T12:00:00.000Z'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('shared-id')
  })
})
