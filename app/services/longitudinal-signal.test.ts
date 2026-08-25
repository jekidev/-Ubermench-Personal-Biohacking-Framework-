import { describe, expect, it } from 'vitest'
import { assessLongitudinalSignals } from './longitudinal-signal'
import type { LongitudinalMetricSummary } from './longitudinal-analytics'

const summary = (overrides: Partial<LongitudinalMetricSummary>): LongitudinalMetricSummary => ({
  key: 'biomarker:CRP:mg/L',
  label: 'CRP',
  first: { id: 'a', recordedAt: '2026-08-01T00:00:00.000Z', value: 1, unit: 'mg/L' },
  last: { id: 'b', recordedAt: '2026-08-10T00:00:00.000Z', value: 2, unit: 'mg/L' },
  delta: 1,
  percentChange: 100,
  direction: 'rising',
  pointCount: 2,
  ...overrides,
})

describe('longitudinal signal synthesis', () => {
  it('emits a directional signal with deterministic rationale', () => {
    const [result] = assessLongitudinalSignals([summary({})])

    expect(result?.signal).toBe('improving')
    expect(result?.magnitude).toBe(100)
    expect(result?.confidence).toBe(0.5)
    expect(result?.rationale).toContain('changed rising')
  })

  it('marks small relative changes as stable', () => {
    const [result] = assessLongitudinalSignals([
      summary({ delta: 0.01, percentChange: 1, direction: 'rising' }),
    ])

    expect(result?.signal).toBe('stable')
  })

  it('does not emit direction when there is insufficient data', () => {
    const [result] = assessLongitudinalSignals([
      summary({ pointCount: 1 }),
    ])

    expect(result?.signal).toBe('insufficient-data')
    expect(result?.confidence).toBe(0.25)
  })
})
