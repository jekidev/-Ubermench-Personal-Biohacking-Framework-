import type { LongitudinalMetricSeries, MetricPoint } from './longitudinal-view'

export type TrendDirection = 'rising' | 'falling' | 'stable' | 'insufficient-data'

export interface LongitudinalMetricSummary {
  key: string
  label: string
  unit?: string
  first: MetricPoint
  last: MetricPoint
  delta: number
  percentChange?: number
  direction: TrendDirection
  pointCount: number
}

const finite = (value: number): boolean => Number.isFinite(value)

/**
 * Build deterministic summaries for visualization/dashboard consumers.
 * A two-point change is used intentionally: it is transparent and does not
 * imply a causal or clinically meaningful trend from sparse observations.
 */
export function summarizeLongitudinalSeries(
  series: LongitudinalMetricSeries[],
): LongitudinalMetricSummary[] {
  return series
    .map((item): LongitudinalMetricSummary | undefined => {
      const points = item.points
        .filter((point) => finite(point.value) && Number.isFinite(Date.parse(point.recordedAt)))
        .slice()
        .sort((a, b) => {
          const time = Date.parse(a.recordedAt) - Date.parse(b.recordedAt)
          return time !== 0 ? time : a.id.localeCompare(b.id)
        })

      const first = points[0]
      const last = points[points.length - 1]
      if (!first || !last) return undefined

      const delta = last.value - first.value
      const percentChange = first.value === 0 ? undefined : (delta / Math.abs(first.value)) * 100
      const epsilon = Math.max(Math.abs(first.value), Math.abs(last.value), 1) * 1e-9
      const direction: TrendDirection = Math.abs(delta) <= epsilon
        ? 'stable'
        : delta > 0
          ? 'rising'
          : 'falling'

      return {
        key: item.key,
        label: item.label,
        unit: item.unit,
        first,
        last,
        delta,
        percentChange,
        direction,
        pointCount: points.length,
      }
    })
    .filter((summary): summary is LongitudinalMetricSummary => summary !== undefined)
    .sort((a, b) => a.key.localeCompare(b.key))
}
