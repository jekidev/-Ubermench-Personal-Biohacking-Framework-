import { describe, expect, it } from 'vitest'
import type { LongitudinalMetricSummary } from './longitudinal-analytics'
import { assessLongitudinalQuality } from './longitudinal-quality'

const summary = (overrides: Partial<LongitudinalMetricSummary> = {}): LongitudinalMetricSummary => ({
  key: 'biomarker:CRP:mg/L',
  label: 'CRP',
  unit: 'mg/L',
  first: { id: 'a', recordedAt: '2026-08-01T00:00:00.000Z', value: 2, unit: 'mg/L' },
  last: { id: 'b', recordedAt: '2026-08-29T00:00:00.000Z', value: 1, unit: 'mg/L' },
  delta: -1,
  percentChange: -50,
  direction: 'falling',
  pointCount: 4,
  ...overrides,
})

describe('longitudinal quality', () => {
  it('classifies dense, long series as high quality', () => {
    const result = assessLongitudinalQuality([summary()])
    expect(result[0]?.dataQuality).toBe('high')
    expect(result[0]?.spanDays).toBe(28)
    expect(result[0]?.comparable).toBe(true)
  })

  it('classifies sparse or short series conservatively', () => {
    const result = assessLongitudinalQuality([
      summary({
        pointCount: 2,
        last: { id: 'b', recordedAt: '2026-08-03T00:00:00.000Z', value: 1, unit: 'mg/L' },
      }),
    ])
    expect(result[0]?.dataQuality).toBe('low')
    expect(result[0]?.spanDays).toBe(2)
  })

  it('flags unit mismatches as non-comparable', () => {
    const result = assessLongitudinalQuality([
      summary({
        last: { id: 'b', recordedAt: '2026-08-29T00:00:00.000Z', value: 1, unit: 'g/L' },
      }),
    ])
    expect(result[0]?.comparable).toBe(false)
  })
})
