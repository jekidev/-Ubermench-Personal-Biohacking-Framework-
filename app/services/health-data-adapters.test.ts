import { describe, expect, it } from 'vitest'
import { normalizeHealthSamples } from './health-data-adapters'

describe('health-data-adapters', () => {
  it('normalizes Garmin and Android Health Connect samples into canonical wearable observations', () => {
    const result = normalizeHealthSamples([
      { id: '1', metric: 'HRV', value: 52, unit: 'ms', recordedAt: '2026-08-25T07:00:00Z', source: 'health-connect' },
      { id: '2', metric: 'heart.rate.resting', value: 58, unit: 'bpm', recordedAt: '2026-08-25T08:00:00Z', source: 'garmin' },
    ], 's1')
    expect(result).toHaveLength(2)
    expect(result[0]?.metric).toBe('hrv')
    expect(result[0]?.source).toBe('wearable')
    expect(result[1]?.observedAt && result[0]?.observedAt && result[1].observedAt > result[0].observedAt).toBe(true)
  })
})
