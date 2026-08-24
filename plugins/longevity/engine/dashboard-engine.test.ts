import { describe, expect, it } from 'vitest'
import { buildDashboardMetrics } from './dashboard-engine'
import type { CanonicalRecord, Observation } from '../domain/canonical-records'

const observation = (id: string, value: number, observedAt: string): CanonicalRecord<Observation> => ({
  id,
  kind: 'observation',
  schemaVersion: '1.0.0',
  createdAt: observedAt,
  payload: {
    subject: 'biomarker',
    key: 'LDL-C',
    value,
    unit: 'mg/dL',
    observedAt,
    status: 'confirmed',
  },
  provenance: [],
})

describe('dashboard engine', () => {
  it('returns baseline for the first confirmed observation', () => {
    const [metric] = buildDashboardMetrics([observation('1', 120, '2026-01-01')], ['LDL-C'])
    expect(metric.status).toBe('baseline')
    expect(metric.previous).toBeNull()
  })

  it('computes delta from the two latest observations', () => {
    const metrics = buildDashboardMetrics([
      observation('1', 120, '2026-01-01'),
      observation('2', 105, '2026-02-01'),
    ], ['LDL-C'])
    expect(metrics[0].delta).toBe(-15)
    expect(metrics[0].direction).toBe('down')
  })

  it('ignores candidate observations', () => {
    const candidate: CanonicalRecord<Observation> = {
      ...observation('1', 100, '2026-01-01'),
      payload: { ...observation('1', 100, '2026-01-01').payload, status: 'candidate' },
    }
    const [metric] = buildDashboardMetrics([candidate], ['LDL-C'])
    expect(metric.status).toBe('unknown')
  })
})
