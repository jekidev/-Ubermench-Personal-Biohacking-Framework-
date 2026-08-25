import { describe, expect, it } from 'vitest'
import type { PersonalBiologyProfile } from '~/types/biology'
import { buildLongitudinalView } from './longitudinal-view'

const profile = (overrides: Partial<PersonalBiologyProfile> = {}): PersonalBiologyProfile => ({
  version: 1,
  biomarkers: [],
  variants: [],
  medications: [],
  supplements: [],
  symptoms: [],
  sleep: [],
  training: [],
  goals: [],
  updatedAt: '2026-08-25T00:00:00.000Z',
  ...overrides,
})

describe('longitudinal view', () => {
  it('sorts events deterministically and ignores malformed timestamps', () => {
    const result = buildLongitudinalView(profile({
      biomarkers: [
        { id: 'b2', name: 'CRP', value: 2, unit: 'mg/L', measuredAt: '2026-08-02T00:00:00.000Z', source: 'lab-import' },
        { id: 'bad', name: 'CRP', value: 99, unit: 'mg/L', measuredAt: 'not-a-date', source: 'manual' },
        { id: 'b1', name: 'CRP', value: 1, unit: 'mg/L', measuredAt: '2026-08-01T00:00:00.000Z', source: 'lab-import' },
      ],
    }))

    expect(result.events.map((event) => event.id)).toEqual(['b1', 'b2'])
  })

  it('builds stable metric series for repeated measurements', () => {
    const result = buildLongitudinalView(profile({
      biomarkers: [
        { id: 'b2', name: 'CRP', value: 2, unit: 'mg/L', measuredAt: '2026-08-02T00:00:00.000Z', source: 'lab-import' },
        { id: 'b1', name: 'CRP', value: 1, unit: 'mg/L', measuredAt: '2026-08-01T00:00:00.000Z', source: 'lab-import' },
      ],
    }))

    expect(result.series).toHaveLength(1)
    expect(result.series[0]?.key).toBe('biomarker:CRP:mg/L')
    expect(result.series[0]?.points.map((point) => point.value)).toEqual([1, 2])
  })

  it('preserves different domains without merging their series', () => {
    const result = buildLongitudinalView(profile({
      symptoms: [{ id: 's1', name: 'Anxiety', severity: 4, recordedAt: '2026-08-01T00:00:00.000Z' }],
      sleep: [{ id: 'sl1', recordedAt: '2026-08-01T00:00:00.000Z', durationMinutes: 420, source: 'wearable' }],
      training: [{ id: 't1', recordedAt: '2026-08-01T00:00:00.000Z', activity: 'Run', durationMinutes: 30 }],
    }))

    expect(result.events).toHaveLength(3)
    expect(result.series.map((series) => series.key)).toEqual([
      'sleep:Sleep duration:min',
      'symptom:Anxiety:',
      'training:Run:min',
    ])
  })
})
