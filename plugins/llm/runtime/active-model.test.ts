import { describe, expect, it } from 'vitest'
import { resolveActiveModel } from './active-model'

describe('active model state', () => {
  it('returns the actual active provider/model', () => {
    const state = resolveActiveModel([
      { provider: 'openrouter', model: 'free-model', free: true, enabled: true, hasApiKey: true },
      { provider: 'openai', model: 'paid-model', free: false, enabled: true, hasApiKey: true },
    ], { autoFreeOnly: true, providerOrder: ['openrouter', 'openai', 'anthropic'] })
    expect(state.active).toEqual({ provider: 'openrouter', model: 'free-model', free: true })
  })
})
