import type { LongitudinalMetricSummary } from './longitudinal-analytics'

export type TrendDataQuality = 'low' | 'moderate' | 'high'

export interface LongitudinalQualitySummary extends LongitudinalMetricSummary {
  spanDays: number
  dataQuality: TrendDataQuality
  comparable: boolean
}

/**
 * Adds transparent data-quality metadata to longitudinal summaries.
 * This is a data-quality signal only; it does not infer causality or clinical significance.
 */
export function assessLongitudinalQuality(
  summaries: LongitudinalMetricSummary[],
): LongitudinalQualitySummary[] {
  return summaries.map((summary) => {
    const spanMs = Math.max(0, Date.parse(summary.last.recordedAt) - Date.parse(summary.first.recordedAt))
    const spanDays = spanMs / 86_400_000
    const dataQuality: TrendDataQuality = summary.pointCount >= 4 && spanDays >= 21
      ? 'high'
      : summary.pointCount >= 2 && spanDays >= 7
        ? 'moderate'
        : 'low'

    return {
      ...summary,
      spanDays,
      dataQuality,
      comparable: summary.pointCount >= 2 && summary.first.unit === summary.last.unit,
    }
  })
}
