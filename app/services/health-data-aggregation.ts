import type { CanonicalObservation } from '~/types/personal-state'

export type AggregationPeriod = 'day' | 'week'

export interface MissingnessSummary {
  metric: string
  period: AggregationPeriod
  expectedPeriods: number
  observedPeriods: number
  missingPeriods: number
  coverage: number
}

export interface AggregatedObservation {
  periodStart: string
  metric: string
  unit?: string
  value: number
  count: number
  quality: number
  confidence: number
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

function periodStart(value: string, period: AggregationPeriod): string {
  const date = new Date(value)
  if (period === 'day') return date.toISOString().slice(0, 10)

  const day = date.getUTCDay()
  const mondayOffset = (day + 6) % 7
  date.setUTCDate(date.getUTCDate() - mondayOffset)
  return date.toISOString().slice(0, 10)
}

function nextPeriod(value: string, period: AggregationPeriod): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + (period === 'day' ? 1 : 7))
  return date.toISOString().slice(0, 10)
}

function qualityWeight(observation: CanonicalObservation): number {
  return Math.max(0.01, clamp(observation.quality) * clamp(observation.confidence))
}

function parseGroupKey(key: string): { start: string; metric: string; unit?: string } {
  const separator = key.indexOf('|')
  const secondSeparator = key.indexOf('|', separator + 1)
  const start = separator === -1 ? key : key.slice(0, separator)
  const metric = separator === -1
    ? ''
    : secondSeparator === -1
      ? key.slice(separator + 1)
      : key.slice(separator + 1, secondSeparator)
  const unit = secondSeparator === -1 ? undefined : key.slice(secondSeparator + 1)

  return { start, metric, ...(unit ? { unit } : {}) }
}

export function aggregateObservations(
  observations: CanonicalObservation[],
  period: AggregationPeriod = 'day',
): AggregatedObservation[] {
  const groups = new Map<string, CanonicalObservation[]>()

  for (const observation of observations) {
    if (!Number.isFinite(observation.value)) continue
    const key = `${periodStart(observation.observedAt, period)}|${observation.metric}|${observation.unit ?? ''}`
    const group = groups.get(key) ?? []
    group.push(observation)
    groups.set(key, group)
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const { start, metric, unit } = parseGroupKey(key)
      const totalWeight = group.reduce((sum, item) => sum + qualityWeight(item), 0)
      const value = group.reduce((sum, item) => sum + item.value * qualityWeight(item), 0) / totalWeight
      return {
        periodStart: start,
        metric,
        ...(unit ? { unit } : {}),
        value,
        count: group.length,
        quality: group.reduce((sum, item) => sum + item.quality, 0) / group.length,
        confidence: group.reduce((sum, item) => sum + item.confidence, 0) / group.length,
      }
    })
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.metric.localeCompare(b.metric))
}

export function summarizeMissingness(
  observations: CanonicalObservation[],
  metric: string,
  start: string,
  end: string,
  period: AggregationPeriod = 'day',
): MissingnessSummary {
  const startPeriod = periodStart(start, period)
  const endPeriod = periodStart(end, period)
  const observedPeriods = new Set(
    observations
      .filter((observation) => observation.metric === metric && Number.isFinite(observation.value))
      .map((observation) => periodStart(observation.observedAt, period)),
  )

  let expectedPeriods = 0
  for (let cursor = startPeriod; cursor <= endPeriod; cursor = nextPeriod(cursor, period)) expectedPeriods += 1

  const observedCount = [...observedPeriods].filter((value) => value >= startPeriod && value <= endPeriod).length
  const missingPeriods = Math.max(0, expectedPeriods - observedCount)

  return {
    metric,
    period,
    expectedPeriods,
    observedPeriods: observedCount,
    missingPeriods,
    coverage: expectedPeriods === 0 ? 0 : observedCount / expectedPeriods,
  }
}
