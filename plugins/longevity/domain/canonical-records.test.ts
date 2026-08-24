import { describe, expect, it } from 'vitest'
import { assertConfirmed, createRecord, type Observation } from './canonical-records'

describe('canonical records', () => {
  it('creates versioned records with provenance', () => {
    const record = createRecord<Observation>({
      id: 'obs-1',
      kind: 'observation',
      payload: {
        subject: 'biomarker',
        key: 'ApoB',
        value: 80,
        unit: 'mg/dL',
        observedAt: '2026-08-24T07:00:00Z',
        status: 'confirmed',
      },
      provenance: [{
        sourceId: 'lab-1',
        sourceType: 'pdf',
        extractionMethod: 'native-text',
        confidence: 0.99,
        importedAt: '2026-08-24T07:01:00Z',
      }],
    })

    expect(record.schemaVersion).toBe('1.0.0')
    expect(record.provenance[0].sourceId).toBe('lab-1')
  })

  it('rejects unconfirmed observations entering the confirmed dataset', () => {
    const record = createRecord<Observation>({
      id: 'obs-2',
      kind: 'observation',
      payload: {
        subject: 'biomarker',
        key: 'CRP',
        value: 2.1,
        unit: 'mg/L',
        observedAt: '2026-08-24T07:00:00Z',
        status: 'candidate',
      },
      provenance: [],
    })

    expect(() => assertConfirmed(record)).toThrow('not confirmed')
  })
})
