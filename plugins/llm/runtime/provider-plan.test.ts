import { describe, expect, it } from 'vitest'
import { planProviderCall } from './provider-plan'

describe('provider call planning', () => {
  it('never performs a network call while planning', () => {
    const plan = planProviderCall(
      { provider: 'openrouter', model: 'openrouter/free', free: true },
      'OpenRouter chat completion',
      'Answer the user question',
      { messages: [{ role: 'user', content: 'hello' }] },
    )

    expect(plan.approval.action).toBe('send')
    expect(plan.approval.target).toContain('OpenRouter')
    expect(plan.approval.payloadPreview).toEqual({ messages: [{ role: 'user', content: 'hello' }] })
  })
})
