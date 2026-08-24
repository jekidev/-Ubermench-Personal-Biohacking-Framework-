import { describe, expect, it } from 'vitest'
import { mean, sevenDayAverage, trendFromBaseline } from '../engine/dashboard'

const now = new Date('2026-08-24T10:00:00.000Z')

const measurements = [
  {
    id: '1', metric: 'resting_hr', category: 'cardiovascular' as const,
    value: 60, unit: 'bpm', timestamp: '2026-08-23T10:00:00.000Z', protocolVersion: '1.0.0'
  },
  {
    id: '2', metric: 'resting_hr', category: 'cardiovascular' as const,
    value: 62, unit: 'bpm', timestamp: '2026-08-22T10:00:00.000Z', protocolVersion: '1.0.0'
  },
  {
    id: '3', metric: 'resting_hr', category: 'cardiovascular' as const,
    value: 64, unit: 'bpm', timestamp: '2026-08-15T10:00:00.000Z', protocolVersion: '1.0.0'
  },
]

describe('longevity dashboard engine', () => {
  it('calculates arithmetic mean', () => {
    expect(mean([60, 62, 64])).toBe(62)
  })

  it('calculates a seven-day metric average', () => {
    expect(sevenDayAverage(measurements, 'resting_hr', now)).toBe(61)
  })

  it('creates an interpretable trend', () => {
    const trend = trendFromBaseline('resting_hr', 70, 60)
    expect(trend.delta).toBe(-10)
    expect(trend.status).toBe('declining')
    expect(trend.algorithmVersion).toBe('longevity-dashboard-v0.1')
  })
})
