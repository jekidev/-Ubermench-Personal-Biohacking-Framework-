import { describe, expect, it } from 'vitest'
import { selectProvidersForRequest, toProviderCandidates } from './llm-provider-bridge'
import type { LLMSettings } from '~/types/llm'

const settings: LLMSettings = {
  preferFree: true,
  autoRotate: true,
  showModel: true,
  allowFrameworkWrite: false,
  providers: [
    { provider: 'openrouter', model: 'openrouter/free', enabled: true, priority: 1, apiKey: 'test-openrouter' },
    { provider: 'openai', model: 'gpt-5.6', enabled: true, priority: 2, apiKey: 'test-openai' },
  ],
}

describe('llm provider bridge', () => {
  it('respects autoFreeOnly when preferFree is enabled', () => {
    const ordered = selectProvidersForRequest(settings, { prompt: 'hello' })
    expect(ordered[0]?.provider).toBe('openrouter')
    expect(toProviderCandidates(settings).filter((candidate) => candidate.free)).toHaveLength(1)
  })

  it('prioritizes explicitly selected provider/model', () => {
    const ordered = selectProvidersForRequest(settings, {
      prompt: 'hello',
      preferredProvider: 'openai',
      preferredModel: 'gpt-5.6',
    })
    expect(ordered[0]?.provider).toBe('openai')
  })
})
