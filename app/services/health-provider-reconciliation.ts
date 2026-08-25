import type { CanonicalObservation } from '~/types/personal-state'

export type ReconciliationPolicy = {
  /** Higher values win when otherwise comparable observations overlap. */
  sourcePriority?: Record<string, number>
  /** Maximum timestamp distance, in milliseconds, for considering records duplicates. */
  duplicateWindowMs?: number
}

export const DEFAULT_RECONCILIATION_POLICY: Required<ReconciliationPolicy> = {
  sourcePriority: {
    'apple-health': 1,
    'health-connect': 1,
    garmin: 0.95,
    oura: 0.95,
    whoop: 0.95,
    fitbit: 0.9,
    polar: 0.9,
    manual: 0.5,
    api: 0.5,
  },
  duplicateWindowMs: 60_000,
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

function sourceId(observation: CanonicalObservation): string {
  return observation.provenance?.adapter ?? observation.source
}

function priority(observation: CanonicalObservation, policy: Required<ReconciliationPolicy>): number {
  return policy.sourcePriority[sourceId(observation)] ?? 0.5
}

function timestamp(observation: CanonicalObservation): number {
  return new Date(observation.observedAt).getTime()
}

function comparable(a: CanonicalObservation, b: CanonicalObservation, windowMs: number): boolean {
  return a.subjectId === b.subjectId
    && a.metric === b.metric
    && (a.unit ?? '') === (b.unit ?? '')
    && Number.isFinite(timestamp(a))
    && Number.isFinite(timestamp(b))
    && Math.abs(timestamp(a) - timestamp(b)) <= windowMs
}

export function rankObservationForReconciliation(
  observation: CanonicalObservation,
  policy: ReconciliationPolicy = {},
): number {
  const effective = { ...DEFAULT_RECONCILIATION_POLICY, ...policy, sourcePriority: { ...DEFAULT_RECONCILIATION_POLICY.sourcePriority, ...policy.sourcePriority } }
  return clamp(priority(observation, effective)) * 0.5
    + clamp(observation.quality) * 0.3
    + clamp(observation.confidence) * 0.2
}

export function reconcileObservations(
  observations: CanonicalObservation[],
  policy: ReconciliationPolicy = {},
): CanonicalObservation[] {
  const effective = { ...DEFAULT_RECONCILIATION_POLICY, ...policy, sourcePriority: { ...DEFAULT_RECONCILIATION_POLICY.sourcePriority, ...policy.sourcePriority } }
  const selected: CanonicalObservation[] = []

  for (const observation of [...observations].sort((a, b) => timestamp(a) - timestamp(b))) {
    const duplicateIndex = selected.findIndex((candidate) => comparable(candidate, observation, effective.duplicateWindowMs))
    if (duplicateIndex === -1) {
      selected.push(observation)
      continue
    }

    const current = selected[duplicateIndex]
    const candidateScore = rankObservationForReconciliation(observation, effective)
    const currentScore = rankObservationForReconciliation(current, effective)
    if (candidateScore > currentScore) selected[duplicateIndex] = observation
  }

  return selected.sort((a, b) => timestamp(a) - timestamp(b))
}
