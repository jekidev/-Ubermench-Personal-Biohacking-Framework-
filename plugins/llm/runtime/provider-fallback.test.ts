import { describe, expect, it } from 'vitest'
import { executeWithProviderFallback } from './provider-fallback'
import type { ProviderCandidate } from './provider-rotation'

const candidates: ProviderCandidate[] = [
  { provider: 'openrouter', model: 'free-a', free: true, enabled: true, hasApiKey: true },
  { provider: 'openai', model: 'free-b', free: true, enabled: true, hasApiKey: true },
]

describe('provider fallback', () => {
  it('falls back after a provider failure', async () => {
    const result = await executeWithProviderFallback(
      candidates,
      { autoFreeOnly: true, providerOrder: ['openrouter', 'openai'] },
      async (provider) => {
        if (provider.provider === 'openrouter') throw new Error('temporary failure')
        return 'ok'
      },
    )

    expect(result.value).toBe('ok')
    expect(result.provider.provider).toBe('openai')
    expect(result.attempts).toHaveLength(2)
  })

  it('fails closed when no eligible provider remains', async () => {
    await expect(executeWithProviderFallback(
      candidates,
      { autoFreeOnly: true, providerOrder: ['openrouter', 'openai'], failedProviders: ['openrouter', 'openai'] },
      async () => 'never',
    )).rejects.toThrow('No eligible LLM provider is available.')
  })
})
