import type { ExperimentSpec } from './experiment-lifecycle'
import { buildExperimentWindows, type ExperimentPhase } from './experiment-lifecycle'

export interface ExperimentFollowupCheckpoint {
  id: string
  experimentId: string
  phase: ExperimentPhase
  scheduledAt: string
  metric: string
  intervention: string
}

function midpoint(start: string, end: string): string {
  const from = new Date(start).getTime()
  const to = new Date(end).getTime()
  return new Date(from + (to - from) * 0.5).toISOString()
}

/** Build deterministic checkpoints for each non-empty experiment phase. */
export function buildExperimentFollowupSchedule(spec: ExperimentSpec): ExperimentFollowupCheckpoint[] {
  return buildExperimentWindows(spec).map((window) => ({
    id: `${spec.id}:${window.phase}`,
    experimentId: spec.id,
    phase: window.phase,
    scheduledAt: midpoint(window.start, window.end),
    metric: spec.metric,
    intervention: spec.intervention,
  }))
}

/** Return checkpoints that are due at or before the supplied instant. */
export function getDueExperimentFollowups(
  checkpoints: ExperimentFollowupCheckpoint[],
  now = new Date().toISOString(),
): ExperimentFollowupCheckpoint[] {
  const nowTime = new Date(now).getTime()
  if (!Number.isFinite(nowTime)) return []

  return checkpoints
    .filter((checkpoint) => {
      const scheduledTime = new Date(checkpoint.scheduledAt).getTime()
      return Number.isFinite(scheduledTime) && scheduledTime <= nowTime
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
}

/** Return only checkpoints still in the future. */
export function getUpcomingExperimentFollowups(
  checkpoints: ExperimentFollowupCheckpoint[],
  now = new Date().toISOString(),
): ExperimentFollowupCheckpoint[] {
  const nowTime = new Date(now).getTime()
  if (!Number.isFinite(nowTime)) return [...checkpoints]

  return checkpoints
    .filter((checkpoint) => new Date(checkpoint.scheduledAt).getTime() > nowTime)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
}
