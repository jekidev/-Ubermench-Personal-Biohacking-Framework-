import { describe, expect, it } from 'vitest'
import type { CanonicalObservation } from '~/types/personal-state'
import { selectSleepObservations, selectWorkoutObservations } from './lifestyle-observations'

function observation(metric: string, observedAt: string): CanonicalObservation {
  return {
    id: `${metric}:${observedAt}`,
    subjectId: 'self',
    observedAt,
    metric,
    value: 1,
    source: 'garmin',
    quality: 1,
    confidence: 1,
  }
}

describe('lifestyle-observations', () => {
  it('selects sleep_score and related Garmin metrics newest first', () => {
    const selected = selectSleepObservations([
      observation('steps', '2026-09-11T10:00:00.000Z'),
      observation('sleep_score', '2026-09-10T06:00:00.000Z'),
      observation('hrv_rmssd', '2026-09-11T06:00:00.000Z'),
    ])
    expect(selected.map((item) => item.metric)).toEqual(['hrv_rmssd', 'sleep_score'])
  })

  it('selects workout duration and training load separately from sleep', () => {
    const selected = selectWorkoutObservations([
      observation('sleep_score', '2026-09-11T06:00:00.000Z'),
      observation('workout_duration', '2026-09-11T08:00:00.000Z'),
      observation('training_load', '2026-09-10T08:00:00.000Z'),
    ])
    expect(selected.map((item) => item.metric)).toEqual(['workout_duration', 'training_load'])
  })
})
