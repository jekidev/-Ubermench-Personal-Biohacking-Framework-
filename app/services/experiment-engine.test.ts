import { describe, expect, it } from 'vitest'
import { summarizeNOf1 } from './experiment-engine'

describe('N-of-1 engine', () => {
  it('returns baseline/intervention delta and counts', () => {
    const now = new Date()
    const day = (daysAgo: number) => {
      const d = new Date(now)
      d.setDate(d.getDate() - daysAgo)
      return d.toISOString()
    }
    const experiment = {
      id: 'x', intervention: 'test', metric: 'hrv', baselineDays: 4, interventionDays: 2,
      observations: [
        { recordedAt: day(5), metric: 'hrv', value: 40 },
        { recordedAt: day(4), metric: 'hrv', value: 42 },
        { recordedAt: day(1), metric: 'hrv', value: 50 },
        { recordedAt: day(0), metric: 'hrv', value: 52 },
        { recordedAt: day(1), metric: 'sleep', value: 99 },
      ],
      status: 'complete' as const,
    }
    const result = summarizeNOf1(experiment, now)
    expect(result.baselineCount).toBe(2)
    expect(result.interventionCount).toBe(2)
    expect(result.delta).toBeGreaterThan(0)
  })

  it('excludes washout observations from baseline', () => {
    const now = new Date()
    const day = (daysAgo: number) => {
      const d = new Date(now)
      d.setDate(d.getDate() - daysAgo)
      return d.toISOString()
    }
    const experiment = {
      id: 'x', intervention: 'test', metric: 'hrv', baselineDays: 5, interventionDays: 2, washoutDays: 1,
      observations: [
        { recordedAt: day(5), metric: 'hrv', value: 40 },
        { recordedAt: day(4), metric: 'hrv', value: 42 },
        { recordedAt: day(3), metric: 'hrv', value: 44 },
        { recordedAt: day(2), metric: 'hrv', value: 60 },
        { recordedAt: day(1), metric: 'hrv', value: 70 },
        { recordedAt: day(0), metric: 'hrv', value: 80 },
      ],
      status: 'complete' as const,
    }
    const result = summarizeNOf1(experiment, now)
    expect(result.baselineCount).toBe(3)
    expect(result.interventionCount).toBe(2)
    expect(result.interventionMean).toBe(75)
  })
})
