import { describe, expect, it } from 'vitest'
import { getHealthProvider, HEALTH_PROVIDER_REGISTRY } from './health-provider-registry'

describe('health-provider-registry', () => {
  it('covers the primary mobile and wearable providers', () => {
    expect(getHealthProvider('health-connect')?.requiresNativeAdapter).toBe(true)
    expect(getHealthProvider('apple-health')?.requiresNativeAdapter).toBe(true)
    expect(getHealthProvider('oura')?.supports).toContain('hrv')
    expect(HEALTH_PROVIDER_REGISTRY.length).toBeGreaterThanOrEqual(8)
  })
})
