import type { LLMMode, LLMProvider, LLMProviderConfig, LLMRequest, LLMResponse, LLMSettings } from '~/types/llm'
import { DEFAULT_LLM_SETTINGS } from '~/types/llm'

const STORAGE_KEY = 'ubermench-llm-settings-v1'

export function loadLLMSettings(): LLMSettings {
  if (import.meta.server || typeof localStorage === 'undefined') return structuredClone(DEFAULT_LLM_SETTINGS)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_LLM_SETTINGS)
    const parsed = JSON.parse(raw) as Partial<LLMSettings>
    return {
      ...structuredClone(DEFAULT_LLM_SETTINGS),
      ...parsed,
      providers: Array.isArray(parsed.providers) ? parsed.providers : structuredClone(DEFAULT_LLM_SETTINGS.providers),
    }
  } catch {
    return structuredClone(DEFAULT_LLM_SETTINGS)
  }
}

export function saveLLMSettings(settings: LLMSettings) {
  if (import.meta.server || typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function modelFor(provider: LLMProviderConfig): string {
  if (provider.model) return provider.model
  if (provider.provider === 'openrouter') return 'openrouter/free'
  if (provider.provider === 'openai') return 'gpt-5.6'
  if (provider.provider === 'anthropic') return 'claude-sonnet-4-20250514'
  return 'remote'
}

function candidates(settings: LLMSettings, mode: LLMMode = 'biohacker'): LLMProviderConfig[] {
  const enabled = settings.providers.filter((p) => p.enabled && p.apiKey)
  const freeFirst = [...enabled].sort((a, b) => {
    const af = settings.preferFree && a.provider === 'openrouter' && modelFor(a) === 'openrouter/free' ? -1 : 0
    const bf = settings.preferFree && b.provider === 'openrouter' && modelFor(b) === 'openrouter/free' ? -1 : 0
    return af - bf || a.priority - b.priority
  })
  if (mode === 'safety' || mode === 'auditor') return freeFirst
  return settings.autoRotate ? freeFirst : freeFirst.slice(0, 1)
}

async function requestOpenAICompatible(baseUrl: string, apiKey: string, model: string, request: LLMRequest, headers: Record<string, string> = {}) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      messages: [
        ...(request.system ? [{ role: 'system', content: request.system }] : []),
        { role: 'user', content: request.prompt },
      ],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1800,
    }),
    signal: request.signal,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status}: ${body?.error?.message ?? 'LLM request failed'}`)
  const text = body?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('Provider returned no text')
  return { text, usage: body?.usage, raw: body }
}

async function requestAnthropic(provider: LLMProviderConfig, request: LLMRequest) {
  const baseUrl = provider.baseUrl ?? 'https://api.anthropic.com/v1'
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': provider.apiKey ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelFor(provider),
      max_tokens: request.maxTokens ?? 1800,
      temperature: request.temperature ?? 0.2,
      system: request.system,
      messages: [{ role: 'user', content: request.prompt }],
    }),
    signal: request.signal,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status}: ${body?.error?.message ?? 'Anthropic request failed'}`)
  const text = Array.isArray(body?.content) ? body.content.filter((x: any) => x?.type === 'text').map((x: any) => x.text).join('\n') : ''
  if (!text.trim()) throw new Error('Anthropic returned no text')
  return { text, usage: body?.usage, raw: body }
}

async function callProvider(provider: LLMProviderConfig, request: LLMRequest) {
  const model = modelFor(provider)
  if (!provider.apiKey) throw new Error('Missing provider API key')
  if (provider.provider === 'anthropic') return requestAnthropic(provider, request)
  if (provider.provider === 'openrouter') return requestOpenAICompatible(provider.baseUrl ?? 'https://openrouter.ai/api/v1', provider.apiKey, model, request, { 'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://ubermench.local', 'X-Title': 'Uberm3nch' })
  if (provider.provider === 'openai') return requestOpenAICompatible(provider.baseUrl ?? 'https://api.openai.com/v1', provider.apiKey, model, request)
  throw new Error('Hugging Face requires the dedicated HF inference engine')
}

export async function orchestrateLLM(request: LLMRequest, settings = loadLLMSettings()): Promise<LLMResponse> {
  const started = performance.now()
  const pool = candidates(settings, request.mode)
  if (!pool.length) throw new Error('No enabled LLM provider with an API key. Add a key in Settings.')
  const errors: string[] = []
  let attempts = 0
  for (const provider of pool) {
    attempts += 1
    try {
      const result = await callProvider(provider, request)
      return {
        id: crypto.randomUUID(), provider: provider.provider, model: modelFor(provider), text: result.text,
        latencyMs: Math.round(performance.now() - started), attempts, fallbackUsed: attempts > 1,
        usage: result.usage, raw: result.raw,
      }
    } catch (error) {
      errors.push(`${provider.provider}/${modelFor(provider)}: ${error instanceof Error ? error.message : String(error)}`)
      if (!settings.autoRotate) break
    }
  }
  throw new Error(`All LLM providers failed. ${errors.join(' | ')}`)
}
