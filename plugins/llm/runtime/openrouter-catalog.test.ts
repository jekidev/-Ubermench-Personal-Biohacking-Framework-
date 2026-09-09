import { describe, expect, it, vi } from 'vitest'
import { discoverOpenRouterFreeModels } from './openrouter-catalog'

describe('openrouter catalog', () => {
  it('returns only zero-priced text models', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: [
        { id: 'vendor/free-model', name: 'Free', context_length: 8000, pricing: { prompt: '0', completion: '0' }, architecture: { output_modalities: ['text'] } },
        { id: 'vendor/paid-model', name: 'Paid', context_length: 8000, pricing: { prompt: '1', completion: '1' }, architecture: { output_modalities: ['text'] } },
      ],
    }), { status: 200 })))

    const models = await discoverOpenRouterFreeModels('test-key')
    expect(models).toHaveLength(1)
    expect(models[0]?.id).toBe('vendor/free-model')
    vi.unstubAllGlobals()
  })
})
