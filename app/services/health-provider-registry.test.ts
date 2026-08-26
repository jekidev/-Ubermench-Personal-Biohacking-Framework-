import { describe, expect, it } from 'vitest'
import { getHealthProvider, HEALTH_PROVIDER_REGISTRY } from './health-provider-registry'

describe('health-provider-registry', () => {
  it('exposes exactly the supported Garmin and Android Health Connect providers', () => {
    expect(HEALTH_PROVIDER_REGISTRY.map((provider) => provider.id)).toEqual(['health-connect', 'garmin'])
    expect(getHealthProvider('health-connect')?.requiresNativeAdapter).toBe(true)
    expect(getHealthProvider('garmin')?.supports).toContain('hrv')
    expect(HEALTH_PROVIDER_REGISTRY).toHaveLength(2)
  })
})
