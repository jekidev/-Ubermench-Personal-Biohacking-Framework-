import { describe, expect, it } from 'vitest'
import { analyzeExperimentSensitivity } from './experiment-sensitivity'

describe('experiment sensitivity', () => {
  it('excludes invalid observations and reports missingness', () => {
    const result = analyzeExperimentSensitivity([
      { recordedAt: '2026-08-01T00:00:00Z', value: 60, phase: 'baseline' },
      { recordedAt: '2026-08-02T00:00:00Z', value: 62, phase: 'baseline' },
      { recordedAt: '2026-08-03T00:00:00Z', value: 70, phase: 'intervention' },
      { recordedAt: 'bad', value: 0, phase: 'intervention' },
    ])
    expect(result.includedCount).toBe(3)
    expect(result.excludedCount).toBe(1)
    expect(result.missingnessRate).toBe(0.25)
  })

  it('reports a stable signal when leave-one-out estimates remain close', () => {
    const result = analyzeExperimentSensitivity([
      { recordedAt: '2026-08-01T00:00:00Z', value: 60, phase: 'baseline' },
      { recordedAt: '2026-08-02T00:00:00Z', value: 61, phase: 'baseline' },
      { recordedAt: '2026-08-03T00:00:00Z', value: 70, phase: 'intervention' },
      { recordedAt: '2026-08-04T00:00:00Z', value: 71, phase: 'intervention' },
    ])
    expect(result.delta).toBe(10)
    expect(result.conclusion).toBe('stable')
  })

  it('flags a signal dominated by one observation', () => {
    const result = analyzeExperimentSensitivity([
      { recordedAt: '2026-08-01T00:00:00Z', value: 60, phase: 'baseline' },
      { recordedAt: '2026-08-02T00:00:00Z', value: 61, phase: 'baseline' },
      { recordedAt: '2026-08-03T00:00:00Z', value: 60, phase: 'intervention' },
      { recordedAt: '2026-08-04T00:00:00Z', value: 120, phase: 'intervention' },
    ])
    expect(result.conclusion).toBe('sensitive-to-observations')
  })
})
