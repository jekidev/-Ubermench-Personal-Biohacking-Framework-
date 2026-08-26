import { describe, expect, it } from 'vitest'
import type { ExternalHealthSample } from './health-data-adapters'
import { DefaultHealthProviderLifecycle, type HealthProviderAdapter } from './health-provider-lifecycle'

const sample: ExternalHealthSample = {
  id: 'garmin-1',
  metric: 'heart-rate',
  value: 62,
  recordedAt: '2026-08-26T01:00:00.000Z',
  source: 'garmin',
}

function adapter(overrides: Partial<HealthProviderAdapter> = {}): HealthProviderAdapter {
  return {
    connect: async () => undefined,
    disconnect: async () => undefined,
    getStatus: async () => 'disconnected',
    sync: async () => [sample],
    ...overrides,
  }
}

describe('health provider lifecycle', () => {
  it('connects and records deterministic connection state', async () => {
    const lifecycle = new DefaultHealthProviderLifecycle('garmin', adapter())
    const state = await lifecycle.connect()
    expect(state.provider).toBe('garmin')
    expect(state.status).toBe('connected')
    expect(state.connectedAt).toBeTypeOf('string')
  })

  it('does not sync while disconnected', async () => {
    const lifecycle = new DefaultHealthProviderLifecycle('health-connect', adapter())
    const result = await lifecycle.sync()
    expect(result.samples).toEqual([])
    expect(result.state.status).toBe('disconnected')
  })

  it('validates sync ranges before invoking the adapter', async () => {
    let calls = 0
    const lifecycle = new DefaultHealthProviderLifecycle('garmin', adapter({
      sync: async () => {
        calls += 1
        return [sample]
      },
    }))
    await lifecycle.connect()
    await expect(lifecycle.sync('2026-08-27T00:00:00.000Z', '2026-08-26T00:00:00.000Z'))
      .rejects.toThrow('must not be after')
    expect(calls).toBe(0)
  })

  it('drops malformed samples and records sync errors', async () => {
    const lifecycle = new DefaultHealthProviderLifecycle('garmin', adapter({
      sync: async () => [
        sample,
        { ...sample, id: 'bad', value: Number.NaN },
        { ...sample, id: 'bad-date', recordedAt: 'not-a-date' },
      ],
    }))
    await lifecycle.connect()
    const result = await lifecycle.sync()
    expect(result.samples).toHaveLength(1)
    expect(result.state.status).toBe('connected')
    expect(result.state.lastSyncAt).toBeTypeOf('string')
  })

  it('moves to error without throwing when the adapter fails', async () => {
    const lifecycle = new DefaultHealthProviderLifecycle('health-connect', adapter({
      sync: async () => { throw new Error('native bridge unavailable') },
    }))
    await lifecycle.connect()
    const result = await lifecycle.sync()
    expect(result.samples).toEqual([])
    expect(result.state.status).toBe('error')
    expect(result.state.lastError).toBe('native bridge unavailable')
  })
})
