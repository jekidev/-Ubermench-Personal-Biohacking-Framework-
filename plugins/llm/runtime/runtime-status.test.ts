import { describe, expect, it } from 'vitest'
import { exhaustedProviderStatus, pendingProviderStatus, runningProviderStatus } from './runtime-status'

describe('provider runtime status', () => {
  it('reports pending approval without implying execution', () => {
    expect(pendingProviderStatus({ provider: 'openrouter', model: 'free-a', free: true })).toMatchObject({
      state: 'pending-approval',
      activeProvider: 'openrouter',
      activeModel: 'free-a',
    })
  })

  it('reports the exact provider and model while running', () => {
    expect(runningProviderStatus({ provider: 'openai', model: 'gpt', free: false })).toMatchObject({
      state: 'running',
      activeProvider: 'openai',
      activeModel: 'gpt',
    })
  })

  it('records exhausted fallback state without hiding failure', () => {
    expect(exhaustedProviderStatus([{ provider: 'openrouter', model: 'free-a', ok: false }], 'all providers failed')).toEqual({
      state: 'exhausted',
      attempts: [{ provider: 'openrouter', model: 'free-a', ok: false }],
      error: 'all providers failed',
    })
  })
})
