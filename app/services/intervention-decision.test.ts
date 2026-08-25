import { describe, expect, it } from 'vitest'
import type { PersonalBiologyProfile, InterventionCandidate } from '~/types/biology'
import { rankInterventionDecisions } from './intervention-decision'

const profile: PersonalBiologyProfile = {
  version: 1,
  biomarkers: [],
  variants: [],
  medications: [],
  supplements: [],
  symptoms: [],
  sleep: [],
  training: [],
  goals: ['longevity'],
  updatedAt: '2026-08-25T00:00:00.000Z',
}

const candidate = (overrides: Partial<InterventionCandidate> = {}): InterventionCandidate => ({
  id: 'candidate-1',
  name: 'Example intervention',
  expectedBenefits: ['example'],
  risks: [],
  interactions: [],
  evidence: [],
  personalFit: 0.8,
  priority: 0.8,
  ...overrides,
})

describe('intervention decision ranking', () => {
  it('keeps ranking and trace priority aligned', () => {
    const result = rankInterventionDecisions(profile, [candidate()])

    expect(result).toHaveLength(1)
    expect(result[0]?.candidate.priority).toBe(result[0]?.trace.priority)
    expect(result[0]?.trace.interventionId).toBe('candidate-1')
  })

  it('forces review when risk or interaction signals exist', () => {
    const result = rankInterventionDecisions(profile, [candidate({ risks: ['signal'] })])

    expect(result[0]?.trace.disposition).toBe('review')
    expect(result[0]?.trace.riskCount).toBe(1)
  })

  it('is deterministic for equivalent candidates', () => {
    const first = rankInterventionDecisions(profile, [candidate({ id: 'a' })])[0]?.trace
    const second = rankInterventionDecisions(profile, [candidate({ id: 'a' })])[0]?.trace

    expect(first).toEqual(second)
  })
})
