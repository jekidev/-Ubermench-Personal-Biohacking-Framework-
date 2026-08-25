import { describe, expect, it } from 'vitest'
import { buildExperimentFollowupSchedule, getDueExperimentFollowups, getNextExperimentFollowup, getUpcomingExperimentFollowups } from './experiment-followup-scheduler'
import type { ExperimentSpec } from './experiment-lifecycle'

const spec: ExperimentSpec = {
  id: 'exp-1',
  subjectId: 'subject-1',
  metric: 'hrv',
  intervention: 'intervention-a',
  baselineDays: 4,
  washoutDays: 2,
  interventionDays: 6,
  followupDays: 4,
  startAt: '2026-08-01T00:00:00.000Z',
}

describe('experiment follow-up scheduler', () => {
  it('creates deterministic mid-phase checkpoints', () => {
    const result = buildExperimentFollowupSchedule(spec)

    expect(result).toHaveLength(4)
    expect(result.map((item) => item.id)).toEqual([
      'exp-1:baseline',
      'exp-1:washout',
      'exp-1:intervention',
      'exp-1:followup',
    ])
    expect(result[0]?.scheduledAt).toBe('2026-08-03T00:00:00.000Z')
    expect(result[2]?.scheduledAt).toBe('2026-08-08T00:00:00.000Z')
  })

  it('separates due and upcoming checkpoints deterministically', () => {
    const schedule = buildExperimentFollowupSchedule(spec)
    const due = getDueExperimentFollowups(schedule, '2026-08-07T00:00:00.000Z')
    const upcoming = getUpcomingExperimentFollowups(schedule, '2026-08-07T00:00:00.000Z')

    expect(due.map((item) => item.phase)).toEqual(['baseline', 'washout'])
    expect(upcoming.map((item) => item.phase)).toEqual(['intervention', 'followup'])
    expect(getNextExperimentFollowup(schedule, '2026-08-07T00:00:00.000Z')?.phase).toBe('intervention')
  })

  it('ignores malformed timestamps instead of producing unsafe checkpoints', () => {
    const schedule = buildExperimentFollowupSchedule(spec)
    const malformed = [
      ...schedule,
      { ...schedule[0]!, id: 'malformed', scheduledAt: 'not-a-date' },
    ]

    expect(getDueExperimentFollowups(malformed, '2026-08-07T00:00:00.000Z').map((item) => item.id)).not.toContain('malformed')
    expect(getUpcomingExperimentFollowups(malformed, '2026-08-07T00:00:00.000Z').map((item) => item.id)).not.toContain('malformed')
  })

  it('does not emit due or next items for an invalid current timestamp', () => {
    const schedule = buildExperimentFollowupSchedule(spec)

    expect(getDueExperimentFollowups(schedule, 'invalid')).toEqual([])
    expect(getUpcomingExperimentFollowups(schedule, 'invalid')).toEqual([])
    expect(getNextExperimentFollowup(schedule, 'invalid')).toBeNull()
  })
})
