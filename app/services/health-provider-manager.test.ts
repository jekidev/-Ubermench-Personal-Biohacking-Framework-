import { describe, expect, it } from 'vitest'
import type { ExternalHealthSample } from './health-data-adapters'
import { HealthProviderManager } from './health-provider-manager'
import type { HealthProviderAdapter } from './health-provider-lifecycle'

const sample: ExternalHealthSample = {
  id: '1',
  metric: 'heart-rate',
  value: 60,
  recordedAt: '2026-08-26T01:00:00.000Z',
  source: 'garmin',
}

function adapter(): HealthProviderAdapter {
  return {
    connect: async () => undefined,
    disconnect: async () => undefined,
    getStatus: async () => 'disconnected',
    sync: async () => [sample],
  }
}

describe('health-provider-manager', () => {
  it('exposes only configured providers and keeps Android Health Connect platform-bound', () => {
    const manager = new HealthProviderManager({
      platform: 'desktop',
      adapters: { garmin: adapter(), 'health-connect': adapter() },
    })

    expect(manager.listAvailableProviders()).toEqual(['garmin'])
    expect(() => manager.getState('health-connect')).toThrow('only available on Android')
  })

  it('requires an explicit adapter instead of silently falling back', () => {
    const manager = new HealthProviderManager({ platform: 'web', adapters: {} })
    expect(manager.listAvailableProviders()).toEqual([])
    expect(() => manager.getState('garmin')).toThrow('adapter is not configured')
  })

  it('runs Garmin through the common lifecycle and sync boundary', async () => {
    const manager = new HealthProviderManager({ platform: 'web', adapters: { garmin: adapter() } })
    await expect(manager.connect('garmin')).resolves.toMatchObject({ status: 'connected', provider: 'garmin' })

    const result = await manager.sync('garmin')
    expect(result.samples).toEqual([sample])
    expect(result.state.status).toBe('connected')
    expect(result.state.lastSyncAt).toBeTypeOf('string')
  })

  it('supports Android Health Connect only on Android', async () => {
    const manager = new HealthProviderManager({ platform: 'android', adapters: { 'health-connect': adapter() } })
    expect(manager.listAvailableProviders()).toEqual(['health-connect'])
    await expect(manager.connect('health-connect')).resolves.toMatchObject({
      provider: 'health-connect',
      status: 'connected',
    })
  })
})
