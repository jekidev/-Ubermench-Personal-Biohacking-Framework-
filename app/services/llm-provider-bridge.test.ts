import { describe, expect, it, vi } from 'vitest'
import {
  clearOpenRouterCatalogCache,
  getOpenRouterCatalogStatus,
  refreshOpenRouterCatalog,
  selectProvidersForRequest,
  toProviderCandidates,
} from './llm-provider-bridge'
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
  it('respects autoFreeOnly when preferFree is enabled', async () => {
    const ordered = await selectProvidersForRequest(settings, { prompt: 'hello' })
    expect(ordered[0]?.provider).toBe('openrouter')
    expect(toProviderCandidates(settings).filter((candidate) => candidate.free)).toHaveLength(1)
  })

  it('prioritizes explicitly selected provider/model', async () => {
    const ordered = await selectProvidersForRequest(settings, {
      prompt: 'hello',
      preferredProvider: 'openai',
      preferredModel: 'gpt-5.6',
    })
    expect(ordered[0]?.provider).toBe('openai')
  })

  it('reports stale catalog before refresh', () => {
    clearOpenRouterCatalogCache()
    const status = getOpenRouterCatalogStatus(settings)
    expect(status.available).toBe(true)
    expect(status.stale).toBe(true)
    expect(status.modelCount).toBe(0)
  })

  it('refreshes and caches OpenRouter free models', async () => {
    clearOpenRouterCatalogCache()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1', context_length: 8192, pricing: { prompt: 0, completion: 0 }, architecture: { output_modalities: ['text'] } },
        ],
      }),
    }))

    const refreshed = await refreshOpenRouterCatalog(settings)
    expect(refreshed.modelCount).toBe(1)
    expect(refreshed.stale).toBe(false)
    expect(getOpenRouterCatalogStatus(settings).models).toContain('meta-llama/llama-3.1-8b-instruct:free')

    vi.unstubAllGlobals()
  })
})
