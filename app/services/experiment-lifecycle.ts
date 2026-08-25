import type { CanonicalObservation } from '~/types/personal-state'

export type ExperimentPhase = 'baseline' | 'washout' | 'intervention' | 'followup'
export interface ExperimentWindow { phase: ExperimentPhase; start: string; end: string }
export interface ExperimentSpec {
  id: string
  subjectId: string
  metric: string
  intervention: string
  baselineDays: number
  interventionDays: number
  washoutDays: number
  followupDays: number
  startAt: string
}

export function buildExperimentWindows(spec: ExperimentSpec): ExperimentWindow[] {
  const start = new Date(spec.startAt)
  const addDays = (date: Date, days: number) => new Date(date.getTime() + Math.max(0, days) * 86400000)
  const baselineEnd = addDays(start, spec.baselineDays)
  const washoutEnd = addDays(baselineEnd, spec.washoutDays)
  const interventionEnd = addDays(washoutEnd, spec.interventionDays)
  const followupEnd = addDays(interventionEnd, spec.followupDays)
  const windows: ExperimentWindow[] = [
    { phase: 'baseline', start: start.toISOString(), end: baselineEnd.toISOString() },
    { phase: 'washout', start: baselineEnd.toISOString(), end: washoutEnd.toISOString() },
    { phase: 'intervention', start: washoutEnd.toISOString(), end: interventionEnd.toISOString() },
    { phase: 'followup', start: interventionEnd.toISOString(), end: followupEnd.toISOString() },
  ]
  return windows.filter((window): window is ExperimentWindow => new Date(window.end) > new Date(window.start))
}

export function annotateExperimentObservations(observations: CanonicalObservation[], spec: ExperimentSpec): CanonicalObservation[] {
  const windows = buildExperimentWindows(spec)
  return observations.map((observation) => {
    const time = new Date(observation.observedAt).getTime()
    const window = windows.find((item) => time >= new Date(item.start).getTime() && time < new Date(item.end).getTime())
    if (!window || observation.subjectId !== spec.subjectId || observation.metric !== spec.metric) return observation
    return { ...observation, context: { ...observation.context, experimentId: spec.id, intervention: spec.intervention, phase: window.phase } }
  })
}
