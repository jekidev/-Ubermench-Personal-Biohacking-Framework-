import type { CanonicalObservation } from '~/types/personal-state'

export const LIFESTYLE_SLEEP_METRICS = [
  'sleep_score',
  'sleepDuration',
  'sleep_duration',
  'sleepEfficiency',
  'sleep_efficiency',
  'hrv',
  'hrv_rmssd',
  'resting_hr',
  'resting_heart_rate',
] as const

export const LIFESTYLE_WORKOUT_METRICS = [
  'workout_duration',
  'training_load',
  'steps',
  'activityMinutes',
] as const

function metricSet(metrics: readonly string[]): Set<string> {
  return new Set(metrics.map((item) => item.toLowerCase()))
}

const SLEEP_SET = metricSet(LIFESTYLE_SLEEP_METRICS)
const WORKOUT_SET = metricSet(LIFESTYLE_WORKOUT_METRICS)

export function selectSleepObservations(observations: CanonicalObservation[]): CanonicalObservation[] {
  return observations
    .filter((item) => SLEEP_SET.has(item.metric.toLowerCase()))
    .slice()
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
}

export function selectWorkoutObservations(observations: CanonicalObservation[]): CanonicalObservation[] {
  return observations
    .filter((item) => WORKOUT_SET.has(item.metric.toLowerCase()))
    .slice()
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
}
