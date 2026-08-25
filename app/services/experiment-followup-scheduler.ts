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

function midpoint(start: string, end: string): string | null {
  const from = new Date(start).getTime()
  const to = new Date(end).getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null

  return new Date(from + (to - from) * 0.5).toISOString()
}

/** Build deterministic checkpoints for each non-empty experiment phase. */
export function buildExperimentFollowupSchedule(spec: ExperimentSpec): ExperimentFollowupCheckpoint[] {
  return buildExperimentWindows(spec).flatMap((window) => {
    const scheduledAt = midpoint(window.start, window.end)
    if (!scheduledAt) return []

    return [{
      id: `${spec.id}:${window.phase}`,
      experimentId: spec.id,
      phase: window.phase,
      scheduledAt,
      metric: spec.metric,
      intervention: spec.intervention,
    }]
  })
}

function sortBySchedule(a: ExperimentFollowupCheckpoint, b: ExperimentFollowupCheckpoint): number {
  const byDate = a.scheduledAt.localeCompare(b.scheduledAt)
  return byDate || a.id.localeCompare(b.id)
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
    .sort(sortBySchedule)
}

/** Return only checkpoints still in the future. */
export function getUpcomingExperimentFollowups(
  checkpoints: ExperimentFollowupCheckpoint[],
  now = new Date().toISOString(),
): ExperimentFollowupCheckpoint[] {
  const nowTime = new Date(now).getTime()
  if (!Number.isFinite(nowTime)) return []

  return checkpoints
    .filter((checkpoint) => {
      const scheduledTime = new Date(checkpoint.scheduledAt).getTime()
      return Number.isFinite(scheduledTime) && scheduledTime > nowTime
    })
    .sort(sortBySchedule)
}

/** Return the next valid checkpoint, or null when no future checkpoint exists. */
export function getNextExperimentFollowup(
  checkpoints: ExperimentFollowupCheckpoint[],
  now = new Date().toISOString(),
): ExperimentFollowupCheckpoint | null {
  return getUpcomingExperimentFollowups(checkpoints, now)[0] ?? null
}
