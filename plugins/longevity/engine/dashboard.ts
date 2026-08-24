import type { Measurement, SafetyFlag, Trend } from '../domain/schema'

const ALGORITHM_VERSION = 'longevity-dashboard-v0.1'

export function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function sevenDayAverage(
  measurements: Measurement<number>[],
  metric: string,
  now = new Date(),
): number | undefined {
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const values = measurements
    .filter((item) => item.metric === metric && new Date(item.timestamp).getTime() >= cutoff)
    .map((item) => item.value)
  return mean(values)
}

export function trendFromBaseline(
  metric: string,
  baseline: number,
  current: number,
  thresholdFraction = 0.05,
): Trend {
  const delta = current - baseline
  const denominator = Math.max(Math.abs(baseline), Number.EPSILON)
  const relativeChange = Math.abs(delta) / denominator

  let status: Trend['status'] = 'stable'
  if (relativeChange >= thresholdFraction) {
    status = delta > 0 ? 'improving' : 'declining'
  }

  return {
    metric,
    status,
    windowDays: 7,
    baseline,
    current,
    delta,
    algorithmVersion: ALGORITHM_VERSION,
  }
}

export function detectMissingBaseline(
  measurements: Measurement<number>[],
  requiredMetrics: string[],
): SafetyFlag[] {
  const recorded = new Set(measurements.map((item) => item.metric))
  const timestamp = new Date().toISOString()

  return requiredMetrics
    .filter((metric) => !recorded.has(metric))
    .map((metric) => ({
      id: `missing-${metric}`,
      severity: 'info' as const,
      category: 'data_quality',
      message: `Baseline measurement missing: ${metric}`,
      triggeredAt: timestamp,
      requiresClinicianReview: false,
    }))
}
