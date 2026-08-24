import { describe, expect, it } from 'vitest'
import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import { estimateInterventionEffect } from './causal-engine'
import { simulateIntervention } from './digital-twin-simulator'
import { SemanticMemoryIndex } from './semantic-memory'
import { normalizeHealthRecords, deduplicateHealthRecords } from './health-data-normalizer'
import { checkPharmacologyInteractions } from './pharmacology-engine'

const profile: PersonalBiologyProfile = {
  version: 1,
  biomarkers: [{ id: 'b1', name: 'CRP', value: 2, unit: 'mg/L', measuredAt: '2026-08-20', source: 'manual' }],
  variants: [], medications: [], supplements: [], symptoms: [], sleep: [], training: [], goals: ['longevity'], updatedAt: '2026-08-20T00:00:00.000Z',
}

const candidate: InterventionCandidate = {
  id: 'i1', name: 'cardiovascular training', mechanism: 'fitness', expectedBenefits: ['cardiovascular health'], risks: [], interactions: [],
  evidence: [{ id: 'e1', title: 'human study', source: 'test', evidenceLevel: 'human-study', confidence: 0.8 }], personalFit: 0.9, priority: 0,
}

describe('advanced intelligence', () => {
  it('estimates an intervention effect without overstating causality', () => {
    const result = estimateInterventionEffect([
      { metric: 'HRV', value: 40, recordedAt: '2026-08-01' },
      { metric: 'HRV', value: 42, recordedAt: '2026-08-02' },
      { metric: 'HRV', value: 50, recordedAt: '2026-08-03', intervention: 'test' },
      { metric: 'HRV', value: 52, recordedAt: '2026-08-04', intervention: 'test' },
    ], 'HRV', 'test')
    expect(result.delta).toBeGreaterThan(0)
    expect(result.limitations.length).toBeGreaterThan(0)
  })

  it('simulates an intervention as a bounded scenario, not a prediction', () => {
    const result = simulateIntervention(profile, { intervention: candidate, horizonDays: 14 })
    expect(result.horizonDays).toBe(14)
    expect(result.expected.trainingSamples).toBeGreaterThanOrEqual(result.baseline.trainingSamples)
    expect(result.limitations.length).toBeGreaterThan(0)
  })

  it('uses embeddings when supplied and lexical fallback otherwise', () => {
    const index = new SemanticMemoryIndex()
    index.upsert({ id: '1', title: 'CRP', content: 'inflammation trend', source: 'lab', tags: ['inflammation'], createdAt: '2026-01-01', updatedAt: '2026-01-01', embedding: [1, 0] })
    index.upsert({ id: '2', title: 'Sleep', content: 'HRV duration', source: 'wearable', tags: ['sleep'], createdAt: '2026-01-01', updatedAt: '2026-01-01', embedding: [0, 1] })
    expect(index.search('CRP', [1, 0])[0]?.id).toBe('1')
    expect(index.search('CRP inflammation')[0]?.id).toBe('1')
  })

  it('normalizes and deduplicates health records with provenance', () => {
    const records = normalizeHealthRecords([
      { kind: 'hrv', recordedAt: '2026-08-20T10:00:00Z', value: 45, unit: 'ms' },
      { kind: 'hrv', recordedAt: 'not-a-date', value: 99, unit: 'ms' },
    ], 'health-connect')
    const deduped = deduplicateHealthRecords([...records, ...records])
    expect(records).toHaveLength(1)
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.source).toBe('health-connect')
  })

  it('flags built-in pharmacology class interactions', () => {
    const findings = checkPharmacologyInteractions(['CNS depressant', 'CNS depressant'])
    expect(findings[0]?.severity).toBe('critical')
  })
})
