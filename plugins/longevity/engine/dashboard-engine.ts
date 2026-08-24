import type { CanonicalRecord, Observation } from '../domain/canonical-records'

export type DashboardMetric = {
  key: string
  latest: Observation | null
  previous: Observation | null
  delta: number | null
  direction: 'up' | 'down' | 'unchanged' | 'unknown'
  status: 'unknown' | 'baseline' | 'stable' | 'improving' | 'declining' | 'needs_review'
}

function numericObservation(record: CanonicalRecord): Observation | null {
  if (record.kind !== 'observation') return null
  const payload = record.payload as Observation
  return payload.subject === 'biomarker' && typeof payload.value === 'number' && payload.status === 'confirmed' ? payload : null
}

export function buildDashboardMetrics(records: readonly CanonicalRecord[], keys: readonly string[]): DashboardMetric[] {
  return keys.map((key) => {
    const observations = records
      .map(numericObservation)
      .filter((item): item is Observation => !!item && item.key === key)
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt))

    const latest = observations.at(-1) ?? null
    const previous = observations.at(-2) ?? null
    if (!latest) return { key, latest, previous, delta: null, direction: 'unknown', status: 'unknown' }
    if (!previous) return { key, latest, previous, delta: null, direction: 'unchanged', status: 'baseline' }

    const delta = Number(latest.value) - Number(previous.value)
    const direction = delta === 0 ? 'unchanged' : delta > 0 ? 'up' : 'down'
    return { key, latest, previous, delta, direction, status: direction === 'unchanged' ? 'stable' : 'needs_review' }
  })
}
