import { describe, expect, it } from 'vitest'
import type { PersonalBiologyProfile } from '~/types/biology'
import { emptyPersonalStateStore } from './personal-state-store'
import { ingestAndRunPersonalState } from './personal-state-runtime'

describe('personal-state-runtime', () => {
  it('persists observations and the resulting human state in one loop', () => {
    const profile: PersonalBiologyProfile = { version: 1, biomarkers: [], variants: [], medications: [], supplements: [], symptoms: [], sleep: [], training: [], goals: [], updatedAt: '2026-08-25T08:00:00Z' }
    const result = ingestAndRunPersonalState(emptyPersonalStateStore(), {
      subjectId: 's1',
      profile,
      candidates: [{ id: 'i1', name: 'x', expectedBenefits: [], risks: [], interactions: [], evidence: [], personalFit: 0.8, priority: 0 }],
      observations: [
        { id: 'o1', subjectId: 's1', observedAt: '2026-08-25T08:00:00Z', metric: 'hrv', value: 50, unit: 'ms', source: 'wearable', quality: 1, confidence: 0.9 },
        { id: 'o2', subjectId: 's1', observedAt: '2026-08-25T09:00:00Z', metric: 'hrv', value: 60, unit: 'ms', source: 'wearable', quality: 1, confidence: 0.9 },
      ],
    }, '2026-08-25T09:01:00Z')

    expect(result.store.observations).toHaveLength(2)
    expect(result.store.states).toHaveLength(1)
    expect(result.loop.state.subjectId).toBe('s1')
  })
})
