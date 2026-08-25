import type { LongitudinalMetricSummary } from './longitudinal-analytics'

export type LongitudinalSignal = 'improving' | 'worsening' | 'stable' | 'insufficient-data'

export interface LongitudinalSignalAssessment {
  key: string
  label: string
  signal: LongitudinalSignal
  magnitude: number
  confidence: number
  pointCount: number
  rationale: string
}

export interface LongitudinalSignalOptions {
  /** Treat changes at or below this relative threshold as stable. */
  stablePercentThreshold?: number
  /** Minimum observations required before a directional signal is emitted. */
  minimumPoints?: number
}

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value))

/**
 * Convert transparent longitudinal summaries into a dashboard-safe signal.
 * This deliberately does not label a direction as clinically good/bad because
 * the desirability of a biomarker depends on its metric-specific semantics.
 */
export function assessLongitudinalSignals(
  summaries: LongitudinalMetricSummary[],
  options: LongitudinalSignalOptions = {},
): LongitudinalSignalAssessment[] {
  const stablePercentThreshold = Math.max(0, options.stablePercentThreshold ?? 2)
  const minimumPoints = Math.max(2, Math.floor(options.minimumPoints ?? 2))

  return summaries
    .map((summary): LongitudinalSignalAssessment => {
      const pointCount = summary.pointCount
      const confidence = clamp(pointCount / Math.max(minimumPoints, 4))
      const percent = summary.percentChange
      const magnitude = Math.abs(percent ?? summary.delta)

      if (pointCount < minimumPoints || summary.direction === 'insufficient-data') {
        return {
          key: summary.key,
          label: summary.label,
          signal: 'insufficient-data',
          magnitude,
          confidence,
          pointCount,
          rationale: `Requires at least ${minimumPoints} observations for a directional signal.`,
        }
      }

      if (percent !== undefined && Math.abs(percent) <= stablePercentThreshold) {
        return {
          key: summary.key,
          label: summary.label,
          signal: 'stable',
          magnitude,
          confidence,
          pointCount,
          rationale: `Relative change is within the ${stablePercentThreshold}% stability threshold.`,
        }
      }

      const signal: LongitudinalSignal = summary.direction === 'rising' ? 'improving' : 'worsening'
      return {
        key: summary.key,
        label: summary.label,
        signal,
        magnitude,
        confidence,
        pointCount,
        rationale: `Value changed ${summary.direction} from the first to the latest valid observation.`,
      }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}
