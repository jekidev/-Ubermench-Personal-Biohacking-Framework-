import { describe, expect, it } from 'vitest'
import type { PersonalBiologyProfile } from '~/types/biology'
import { DEFAULT_ADAPTATION_RULES, evaluatePolicyRules } from './policy-engine'
import { learnOutcome } from './outcome-learning'
import { rankValueOfInformation } from './value-of-information'
import { buildDailyPlan } from './daily-planner'

const profile: PersonalBiologyProfile = {
  version: 1,
  biomarkers: [], variants: [], medications: [], supplements: [], symptoms: [], sleep: [], training: [],
  goals: ['longevity'], updatedAt: '2026-08-24T00:00:00.000Z',
}

describe('adaptive intelligence', () => {
  it('matches the highest-priority adaptive rule', () => {
    const result = evaluatePolicyRules([{ metric: 'HRV', value: 20 }, { metric: 'CRP', value: 7 }], DEFAULT_ADAPTATION_RULES)
    expect(result.action).toBe('collect-data')
  })

  it('does not overstate small samples', () => {
    const result = learnOutcome('HRV', [40, 41, 42], [45, 46, 47])
    expect(result.confidence).toBe('low')
  })

  it('ranks high-value missing data first', () => {
    expect(rankValueOfInformation(profile)[0]?.metric).toBe('core biomarkers')
  })

  it('builds a conservative plan when recovery signals are poor', () => {
    const plan = buildDailyPlan({ profile, objectives: [{ id: 'longevity', weight: 1 }], protocol: [], observations: [{ metric: 'HRV', value: 20 }] })
    expect(plan.recoveryState).toBe('low')
    expect(plan.actions).toHaveLength(1)
    expect(plan.actions[0]?.title).toContain('Reduce or defer')
  })
})
