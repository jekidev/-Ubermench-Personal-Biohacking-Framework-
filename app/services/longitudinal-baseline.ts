import type { LongitudinalMetricSeries, MetricPoint } from './longitudinal-view'

export interface LongitudinalBaselineSummary {
  key: string
  label: string
  unit?: string
  baselineValue?: number
  latestValue: number
  deltaFromBaseline?: number
  percentFromBaseline?: number
  baselinePointCount: number
  comparable: boolean
}

const validPoint = (point: MetricPoint): boolean =>
  Number.isFinite(point.value) && Number.isFinite(Date.parse(point.recordedAt))

const median = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
}

/**
 * Compare the latest observation with the median of all earlier observations.
 * The median is used to reduce sensitivity to one-off outliers. This is a
 * descriptive baseline and must not be interpreted as a causal or clinical
 * target.
 */
export function summarizeLongitudinalBaselines(
  series: LongitudinalMetricSeries[],
): LongitudinalBaselineSummary[] {
  return series
    .map((item): LongitudinalBaselineSummary | undefined => {
      const points = item.points
        .filter(validPoint)
        .slice()
        .sort((a, b) => {
          const time = Date.parse(a.recordedAt) - Date.parse(b.recordedAt)
          return time !== 0 ? time : a.id.localeCompare(b.id)
        })

      const latest = points[points.length - 1]
      if (!latest) return undefined

      const comparable = points.every((point) => point.unit === latest.unit)
      const baselinePoints = comparable ? points.slice(0, -1) : []
      const baselineValue = median(baselinePoints.map((point) => point.value))
      const deltaFromBaseline = baselineValue === undefined ? undefined : latest.value - baselineValue
      const percentFromBaseline = baselineValue === undefined || baselineValue === 0
        ? undefined
        : (deltaFromBaseline! / Math.abs(baselineValue)) * 100

      return {
        key: item.key,
        label: item.label,
        unit: latest.unit,
        baselineValue,
        latestValue: latest.value,
        deltaFromBaseline,
        percentFromBaseline,
        baselinePointCount: baselinePoints.length,
        comparable,
      }
    })
    .filter((summary): summary is LongitudinalBaselineSummary => summary !== undefined)
    .sort((a, b) => a.key.localeCompare(b.key))
}
