import { describe, expect, it } from 'vitest'
import { selectNextProvider, type ProviderCandidate } from './provider-rotation'

const candidates: ProviderCandidate[] = [
  { provider: 'openrouter', model: 'free-a', free: true, enabled: true, hasApiKey: true },
  { provider: 'openai', model: 'paid-a', free: false, enabled: true, hasApiKey: true },
  { provider: 'anthropic', model: 'claude-a', free: false, enabled: true, hasApiKey: true },
]

describe('provider rotation', () => {
  it('respects autoFreeOnly', () => {
    expect(selectNextProvider(candidates, { autoFreeOnly: true, providerOrder: ['openai', 'openrouter', 'anthropic'] })).toEqual({ provider: 'openrouter', model: 'free-a', free: true })
  })

  it('uses configured provider order when free-only is disabled', () => {
    expect(selectNextProvider(candidates, { autoFreeOnly: false, providerOrder: ['openai', 'openrouter', 'anthropic'] })).toEqual({ provider: 'openai', model: 'paid-a', free: false })
  })

  it('falls back after a provider failure', () => {
    expect(selectNextProvider(candidates, { autoFreeOnly: false, providerOrder: ['openai', 'openrouter', 'anthropic'], failedProviders: ['openai'] })).toEqual({ provider: 'openrouter', model: 'free-a', free: true })
  })

  it('skips disabled or keyless candidates', () => {
    expect(selectNextProvider([{ ...candidates[2], enabled: true, hasApiKey: false }], { autoFreeOnly: false, providerOrder: ['anthropic'] })).toBeNull()
  })
})
