import { describe, expect, it } from 'vitest'
import { calculateBiomarkerTrend } from './biomarker-engine'

describe('biomarker engine', () => {
  it('rejects mixed units instead of calculating a false delta', () => {
    const result = calculateBiomarkerTrend([
      { id: '1', name: 'glucose', value: 100, unit: 'mg/dL', measuredAt: '2026-01-01', source: 'manual' },
      { id: '2', name: 'glucose', value: 5.5, unit: 'mmol/L', measuredAt: '2026-02-01', source: 'manual' },
    ], 'glucose')
    expect(result.direction).toBe('unit-mismatch')
    expect(result.delta).toBeUndefined()
  })

  it('ignores malformed measurement dates', () => {
    const result = calculateBiomarkerTrend([
      { id: '1', name: 'CRP', value: 4, unit: 'mg/L', measuredAt: 'bad-date', source: 'manual' },
      { id: '2', name: 'CRP', value: 2, unit: 'mg/L', measuredAt: '2026-02-01', source: 'manual' },
    ], 'CRP')
    expect(result.count).toBe(1)
    expect(result.direction).toBe('insufficient-data')
  })
})
