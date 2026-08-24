import { buildDashboardMetrics, type DashboardMetric } from './dashboard-engine'
import type { CanonicalRecord } from '../domain/canonical-records'

export type DashboardPayload = {
  generatedAt: string
  metrics: DashboardMetric[]
  needsReviewCount: number
}

export function buildDashboardPayload(records: readonly CanonicalRecord[], keys: readonly string[]): DashboardPayload {
  const metrics = buildDashboardMetrics(records, keys)
  return {
    generatedAt: new Date().toISOString(),
    metrics,
    needsReviewCount: metrics.filter((metric) => metric.status === 'needs_review').length,
  }
}
