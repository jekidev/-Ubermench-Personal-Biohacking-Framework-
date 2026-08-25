import { describe, expect, it } from 'vitest'
import { summarizeLongitudinalSeries } from './longitudinal-analytics'

const point = (id: string, recordedAt: string, value: number) => ({ id, recordedAt, value })

describe('longitudinal analytics', () => {
  it('summarizes deterministic first-to-last change', () => {
    const result = summarizeLongitudinalSeries([
      {
        key: 'biomarker:CRP:mg/L',
        label: 'CRP',
        unit: 'mg/L',
        points: [
          point('b2', '2026-08-10T00:00:00.000Z', 2),
          point('b1', '2026-08-01T00:00:00.000Z', 1),
        ],
      },
    ])

    expect(result[0]?.first.value).toBe(1)
    expect(result[0]?.last.value).toBe(2)
    expect(result[0]?.delta).toBe(1)
    expect(result[0]?.percentChange).toBe(100)
    expect(result[0]?.direction).toBe('rising')
    expect(result[0]?.pointCount).toBe(2)
  })

  it('handles zero baselines without producing Infinity', () => {
    const result = summarizeLongitudinalSeries([
      {
        key: 'training:Run:min',
        label: 'Run',
        unit: 'min',
        points: [
          point('a', '2026-08-01T00:00:00.000Z', 0),
          point('b', '2026-08-02T00:00:00.000Z', 30),
        ],
      },
    ])

    expect(result[0]?.percentChange).toBeUndefined()
    expect(Number.isFinite(result[0]?.delta ?? Number.NaN)).toBe(true)
  })

  it('ignores malformed points and returns stable ordering', () => {
    const result = summarizeLongitudinalSeries([
      {
        key: 'z',
        label: 'Z',
        points: [point('bad', 'not-a-date', 99)],
      },
      {
        key: 'a',
        label: 'A',
        points: [
          point('new', '2026-08-02T00:00:00.000Z', 5),
          point('old', '2026-08-01T00:00:00.000Z', 5),
        ],
      },
    ])

    expect(result.map((summary) => summary.key)).toEqual(['a'])
    expect(result[0]?.direction).toBe('stable')
  })
})
