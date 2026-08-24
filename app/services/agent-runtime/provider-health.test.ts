import { describe, expect, it } from 'vitest'
import { ProviderHealthRegistry } from './provider-health'

describe('provider health circuit breaker', () => {
  it('opens after repeated failures and reopens after cooldown', () => {
    const registry = new ProviderHealthRegistry()
    registry.recordFailure('openai', 1)
    registry.recordFailure('openai', 2)
    expect(registry.isAvailable('openai', 3)).toBe(true)
    registry.recordFailure('openai', 4)
    registry.recordFailure('openai', 5)
    registry.recordFailure('openai', 6)
    expect(registry.isAvailable('openai', 7)).toBe(false)
    expect(registry.isAvailable('openai', 30_007)).toBe(true)
  })

  it('success resets the failure state', () => {
    const registry = new ProviderHealthRegistry()
    registry.recordFailure('anthropic')
    registry.recordFailure('anthropic')
    registry.recordSuccess('anthropic')
    expect(registry.get('anthropic').state).toBe('healthy')
    expect(registry.get('anthropic').failures).toBe(0)
  })
})
