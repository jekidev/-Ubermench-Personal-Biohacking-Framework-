import { describe, expect, it } from 'vitest'
import type { BiomarkerRecord, InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import { observationFromBiomarker, observationFromSleep, mergeObservations } from './personal-data-fabric'
import { buildHumanState } from './human-state-engine'
import { runBiohackingLoop } from './biohacking-loop'
import { personalEffect } from './bayesian-personalization'
import { summarizeUncertainty } from './uncertainty-engine'

describe('core integration', () => {
  const profile: PersonalBiologyProfile = { version: 1, biomarkers: [], variants: [], medications: [], supplements: [], symptoms: [], sleep: [], training: [], goals: [], updatedAt: new Date().toISOString() }
  const crp: BiomarkerRecord = { id: 'b1', name: 'crp', value: 2, unit: 'mg/L', measuredAt: '2026-08-01T08:00:00Z', source: 'lab-import' }

  it('normalizes observations into a longitudinal fabric', () => {
    const biomarker = observationFromBiomarker(crp, 'subject-1')
    const sleep = observationFromSleep({ id: 's1', recordedAt: '2026-08-02T08:00:00Z', durationMinutes: 450, efficiency: 90, hrv: 55, source: 'wearable' }, 'subject-1')
    const merged = mergeObservations([biomarker], sleep)
    expect(merged).toHaveLength(5)
    expect(merged[0].subjectId).toBe('subject-1')
  })

  it('builds a state vector from canonical observations', () => {
    const state = buildHumanState('subject-1', [observationFromBiomarker(crp, 'subject-1'), { id: 'h1', subjectId: 'subject-1', observedAt: '2026-08-01T08:00:00Z', metric: 'hrv', value: 55, unit: 'ms', source: 'wearable', quality: 1, confidence: 0.9 }])
    expect(state.version).toBe(1)
    expect(state.dimensions.inflammatory?.value).toBe(2)
    expect(state.dimensions.recovery?.value).toBe(55)
  })

  it('produces a personal posterior and uncertainty estimate', () => {
    const result = personalEffect([10, 11, 9, 10], [12, 13, 12, 11])
    expect(result.delta).toBeGreaterThan(0)
    expect(result.confidence).toBeGreaterThan(0)
    const uncertainty = summarizeUncertainty([10, 11, 9, 10])
    expect(uncertainty.lower).toBeDefined()
    expect(uncertainty.upper).toBeDefined()
  })

  it('runs state -> intervention ranking -> personal signal', () => {
    const candidate: InterventionCandidate = { id: 'i1', name: 'intervention-a', expectedBenefits: ['target'], risks: [], interactions: [], evidence: [], personalFit: 0.8, priority: 0 }
    const observations = [
      { id: 'o1', subjectId: 'subject-1', observedAt: '2026-08-01T08:00:00Z', metric: 'hrv', value: 50, source: 'wearable', quality: 1, confidence: 0.9, context: { intervention: 'intervention-a', phase: 'baseline' } },
      { id: 'o2', subjectId: 'subject-1', observedAt: '2026-08-02T08:00:00Z', metric: 'hrv', value: 60, source: 'wearable', quality: 1, confidence: 0.9, context: { intervention: 'intervention-a', phase: 'intervention' } },
    ]
    const result = runBiohackingLoop({ subjectId: 'subject-1', profile, observations, candidates })
    expect(result.rankedInterventions[0].id).toBe('i1')
    expect(result.personalSignals.i1.delta).toBe(10)
  })
})
