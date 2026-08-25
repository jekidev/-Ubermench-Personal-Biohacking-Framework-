import { describe, expect, it } from 'vitest'
import { summarizeLongitudinalBaselines } from './longitudinal-baseline'

const series = (points: Array<{ id: string; recordedAt: string; value: number; unit?: string }>) => [{
  key: 'biomarker:CRP:mg/L',
  label: 'CRP',
  unit: 'mg/L',
  points,
}]

describe('longitudinal baselines', () => {
  it('uses the median of prior observations instead of the latest value', () => {
    const result = summarizeLongitudinalBaselines(series([
      { id: 'a', recordedAt: '2026-08-01T00:00:00.000Z', value: 1, unit: 'mg/L' },
      { id: 'b', recordedAt: '2026-08-02T00:00:00.000Z', value: 3, unit: 'mg/L' },
      { id: 'c', recordedAt: '2026-08-03T00:00:00.000Z', value: 100, unit: 'mg/L' },
      { id: 'd', recordedAt: '2026-08-04T00:00:00.000Z', value: 5, unit: 'mg/L' },
    ]))

    expect(result[0]?.baselineValue).toBe(3)
    expect(result[0]?.latestValue).toBe(5)
    expect(result[0]?.deltaFromBaseline).toBe(2)
    expect(result[0]?.baselinePointCount).toBe(3)
  })

  it('reports no baseline when there is only one valid observation', () => {
    const result = summarizeLongitudinalBaselines(series([
      { id: 'a', recordedAt: '2026-08-01T00:00:00.000Z', value: 2, unit: 'mg/L' },
    ]))

    expect(result[0]?.baselineValue).toBeUndefined()
    expect(result[0]?.baselinePointCount).toBe(0)
    expect(result[0]?.latestValue).toBe(2)
  })

  it('rejects mixed units as non-comparable', () => {
    const result = summarizeLongitudinalBaselines(series([
      { id: 'a', recordedAt: '2026-08-01T00:00:00.000Z', value: 2, unit: 'mg/L' },
      { id: 'b', recordedAt: '2026-08-02T00:00:00.000Z', value: 1, unit: 'g/L' },
    ]))

    expect(result[0]?.comparable).toBe(false)
    expect(result[0]?.baselineValue).toBeUndefined()
  })
})
