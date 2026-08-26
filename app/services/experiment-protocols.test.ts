import { describe, expect, it } from 'vitest'
import { createProtocolSpec, EXPERIMENT_PROTOCOL_TEMPLATES, validateExperimentProtocol } from './experiment-protocols'

const base = {
  id: 'exp-1', subjectId: 'subject-1', metric: 'resting_hr', intervention: 'intervention-a',
  baselineDays: 7, interventionDays: 14, washoutDays: 7, followupDays: 7, startAt: '2026-08-01T00:00:00.000Z',
}

describe('experiment protocol templates', () => {
  it('ships the three supported research designs', () => {
    expect(EXPERIMENT_PROTOCOL_TEMPLATES.map((item) => item.id)).toEqual(['single-subject-crossover', 'ab-ba', 'randomized-n-of-1'])
  })

  it('requires washout for AB/BA', () => {
    const issues = validateExperimentProtocol({ ...base, washoutDays: 0 }, 'ab-ba')
    expect(issues.some((issue) => issue.field === 'washoutDays' && issue.severity === 'error')).toBe(true)
  })

  it('rejects missing primary metric and invalid timestamps', () => {
    const issues = validateExperimentProtocol({ ...base, metric: '', startAt: 'invalid' }, 'single-subject-crossover')
    expect(issues.filter((issue) => issue.severity === 'error').map((issue) => issue.field)).toEqual(expect.arrayContaining(['metric', 'startAt']))
  })

  it('returns a validated design-attached protocol', () => {
    expect(createProtocolSpec(base, 'randomized-n-of-1').design).toBe('randomized-n-of-1')
  })
})
