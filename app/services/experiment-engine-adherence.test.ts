import { describe, expect, it } from 'vitest'
import { summarizeNOf1 } from './experiment-engine'

describe('N-of-1 adherence and safety tracking', () => {
  it('summarizes adherence and adverse events without affecting biomarker statistics', () => {
    const result = summarizeNOf1({
      id: 'adherence', intervention: 'test', metric: 'hrv', baselineDays: 2, interventionDays: 2,
      observations: [
        { recordedAt: '2026-08-23T04:00:00.000Z', metric: 'hrv', value: 40 },
        { recordedAt: '2026-08-24T04:00:00.000Z', metric: 'hrv', value: 50 },
      ],
      adherence: [
        { plannedAt: '2026-08-23T08:00:00.000Z', completed: true, completedAt: '2026-08-23T08:05:00.000Z' },
        { plannedAt: '2026-08-24T08:00:00.000Z', completed: false },
        { plannedAt: '2026-08-25T08:00:00.000Z', completed: true },
      ],
      adverseEvents: [
        { recordedAt: '2026-08-24T10:00:00.000Z', severity: 'mild', description: 'transient symptom' },
        { recordedAt: '2026-08-25T10:00:00.000Z', severity: 'severe', description: 'serious event', related: true },
        { recordedAt: '2026-08-25T11:00:00.000Z', severity: 'moderate', description: 'unrelated event', related: false },
      ],
      status: 'complete',
    }, new Date('2026-08-25T12:00:00.000Z'))

    expect(result.adherenceCount).toBe(3)
    expect(result.completedAdherence).toBe(2)
    expect(result.adherenceRate).toBeCloseTo(2 / 3)
    expect(result.adverseEventCount).toBe(3)
    expect(result.relatedAdverseEventCount).toBe(2)
    expect(result.severeAdverseEventCount).toBe(1)
  })
})
