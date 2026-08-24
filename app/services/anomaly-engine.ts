import type { AnomalySignal } from '~/types/core'

export interface BaselineMetric {
  metric: string
  baseline: number
  tolerancePct?: number
}

function validNumber(value: number): boolean {
  return Number.isFinite(value)
}

export function detectAnomalies(metrics: Array<{ metric: string; value: number; recordedAt?: string }>, baselines: BaselineMetric[], now = new Date().toISOString()): AnomalySignal[] {
  const baselineMap = new Map(baselines.map((item) => [item.metric.toLowerCase(), item]))
  const signals: AnomalySignal[] = []

  for (const item of metrics) {
    if (!validNumber(item.value)) continue
    const baseline = baselineMap.get(item.metric.toLowerCase())
    if (!baseline || !validNumber(baseline.baseline) || baseline.baseline === 0) continue

    const deviationPct = ((item.value - baseline.baseline) / Math.abs(baseline.baseline)) * 100
    const tolerance = Math.max(0.5, Math.abs(baseline.tolerancePct ?? 10))
    const magnitude = Math.abs(deviationPct)
    if (magnitude < tolerance) continue

    signals.push({
      metric: item.metric,
      observed: item.value,
      baseline: baseline.baseline,
      deviationPct,
      severity: magnitude >= tolerance * 2 ? 'critical' : magnitude >= tolerance * 1.5 ? 'warning' : 'info',
      direction: deviationPct > 0 ? 'up' : 'down',
      detectedAt: item.recordedAt ?? now,
    })
  }

  return signals.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))
}
