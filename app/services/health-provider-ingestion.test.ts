import { describe, expect, it } from 'vitest'
import { normalizeProviderObservations, syncHealthProvider, type HealthProviderAdapter } from './health-provider-ingestion'

describe('health provider ingestion', () => {
  it('normalizes, filters and deterministically orders provider observations', () => {
    const result = normalizeProviderObservations('health-connect', [
      { metric: ' steps ', value: 9000, observedAt: '2026-08-24T12:00:00Z' },
      { metric: '', value: 1, observedAt: '2026-08-24T11:00:00Z' },
      { metric: 'heart-rate', value: Number.NaN, observedAt: '2026-08-24T11:00:00Z' },
      { metric: 'heart-rate', value: 62, observedAt: '2026-08-24T11:00:00Z', quality: 2, confidence: -1 },
      { metric: 'sleep', value: 8, observedAt: 'not-a-date' },
    ])

    expect(result).toHaveLength(2)
    expect(result[0]?.metric).toBe('heart-rate')
    expect(result[0]?.quality).toBe(1)
    expect(result[0]?.confidence).toBe(0)
    expect(result[1]?.metric).toBe('steps')
  })

  it('rejects an inverted or malformed sync window without calling the adapter', async () => {
    let called = false
    const adapter: HealthProviderAdapter = {
      provider: 'health-connect',
      connect: async () => { called = true },
      disconnect: async () => {},
      readObservations: async () => [],
    }

    const result = await syncHealthProvider(adapter, '2026-08-25T00:00:00Z', '2026-08-24T00:00:00Z')
    expect(result.state).toBe('error')
    expect(result.error).toBe('Invalid sync window')
    expect(called).toBe(false)
  })

  it('returns normalized observations and provider errors deterministically', async () => {
    const adapter: HealthProviderAdapter = {
      provider: 'health-connect',
      connect: async () => {},
      disconnect: async () => {},
      readObservations: async () => [
        { metric: 'steps', value: 1000, observedAt: '2026-08-24T10:00:00Z', quality: 0.9, confidence: 0.95 },
      ],
    }

    const result = await syncHealthProvider(adapter, '2026-08-24T00:00:00Z', '2026-08-25T00:00:00Z')
    expect(result.state).toBe('connected')
    expect(result.observations[0]?.provider).toBe('health-connect')
    expect(result.observations[0]?.quality).toBe(0.9)

    const failing: HealthProviderAdapter = {
      ...adapter,
      connect: async () => { throw new Error('permission denied') },
    }
    const failed = await syncHealthProvider(failing, '2026-08-24T00:00:00Z', '2026-08-25T00:00:00Z')
    expect(failed.state).toBe('error')
    expect(failed.error).toBe('permission denied')
  })
})
