import { describe, expect, it } from 'vitest'
import { orchestrateLLM } from '~/services/llm-orchestrator'
import type { LLMSettings } from '~/types/llm'

describe('agent runtime LLM routing', () => {
  it('prioritizes the explicitly selected provider/model', async () => {
    const settings: LLMSettings = {
      preferFree: true,
      autoRotate: true,
      showModel: true,
      providers: [
        { provider: 'openrouter', model: 'openrouter/free', enabled: true, priority: 1, apiKey: 'test-openrouter' },
        { provider: 'openai', model: 'gpt-5.6', enabled: true, priority: 2, apiKey: 'test-openai' },
      ],
    }
    const originalFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => { calls.push(String(input)); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
    try {
      const result = await orchestrateLLM({ prompt: 'test', preferredProvider: 'openai', preferredModel: 'gpt-5.6' }, settings)
      expect(result.provider).toBe('openai')
      expect(result.model).toBe('gpt-5.6')
      expect(calls[0]).toContain('api.openai.com')
    } finally { globalThis.fetch = originalFetch }
  })
})
