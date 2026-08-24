import type { LLMMode, LLMProviderConfig, LLMRequest, LLMResponse, LLMSettings } from '~/types/llm'
import { DEFAULT_LLM_SETTINGS } from '~/types/llm'

const STORAGE_KEY = 'ubermench-llm-settings-v1'
const SECRET_STORAGE_KEY = 'ubermench-llm-session-keys-v1'
const DEFAULT_TIMEOUT_MS = 45_000

type PersistedLLMSettings = Omit<LLMSettings, 'providers'> & {
  providers: Array<Omit<LLMProviderConfig, 'apiKey'> & { apiKey?: never }>
}

function readSessionKeys(): Record<string, string> {
  if (import.meta.server || typeof sessionStorage === 'undefined') return {}
  try {
    const value = JSON.parse(sessionStorage.getItem(SECRET_STORAGE_KEY) ?? '{}')
    return value && typeof value === 'object' ? value as Record<string, string> : {}
  } catch {
    return {}
  }
}

function writeSessionKeys(settings: LLMSettings) {
  if (import.meta.server || typeof sessionStorage === 'undefined') return
  try {
    const keys = Object.fromEntries(settings.providers.filter((p) => p.apiKey?.trim()).map((p) => [p.provider, p.apiKey]))
    sessionStorage.setItem(SECRET_STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // Some privacy modes disable web storage; the current in-memory state remains usable.
  }
}

function sanitizeForStorage(settings: LLMSettings): PersistedLLMSettings {
  return {
    preferFree: settings.preferFree,
    autoRotate: settings.autoRotate,
    showModel: settings.showModel,
    providers: settings.providers.map(({ apiKey: _apiKey, ...provider }) => provider),
  }
}

export function loadLLMSettings(): LLMSettings {
  if (import.meta.server || typeof localStorage === 'undefined') return structuredClone(DEFAULT_LLM_SETTINGS)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) as Partial<PersistedLLMSettings> : {}
    const sessionKeys = readSessionKeys()
    return {
      ...structuredClone(DEFAULT_LLM_SETTINGS),
      ...parsed,
      providers: Array.isArray(parsed.providers)
        ? parsed.providers.map((stored) => ({
            ...structuredClone(DEFAULT_LLM_SETTINGS.providers.find((p) => p.provider === stored.provider) ?? { provider: stored.provider, enabled: false, priority: 99 }),
            ...stored,
            apiKey: sessionKeys[stored.provider],
          }))
        : structuredClone(DEFAULT_LLM_SETTINGS.providers).map((p) => ({ ...p, apiKey: sessionKeys[p.provider] })),
    }
  } catch {
    return structuredClone(DEFAULT_LLM_SETTINGS).map ? structuredClone(DEFAULT_LLM_SETTINGS) : structuredClone(DEFAULT_LLM_SETTINGS)
  }
}

export function saveLLMSettings(settings: LLMSettings) {
  if (import.meta.server || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeForStorage(settings)))
    writeSessionKeys(settings)
  } catch {
    // Storage may be unavailable/full; inference remains usable for the current state.
  }
}

export function clearLLMSessionKeys() {
  if (import.meta.server || typeof sessionStorage === 'undefined') return
  try { sessionStorage.removeItem(SECRET_STORAGE_KEY) } catch { /* ignore */ }
}

function modelFor(provider: LLMProviderConfig): string {
  if (provider.model?.trim()) return provider.model.trim()
  if (provider.provider === 'openrouter') return 'openrouter/free'
  return ''
}

function candidates(settings: LLMSettings, mode: LLMMode = 'biohacker'): LLMProviderConfig[] {
  const enabled = settings.providers.filter((p) => p.enabled && p.apiKey?.trim())
  const ordered = [...enabled].sort((a, b) => {
    const af = settings.preferFree && a.provider === 'openrouter' && modelFor(a) === 'openrouter/free' ? -1 : 0
    const bf = settings.preferFree && b.provider === 'openrouter' && modelFor(b) === 'openrouter/free' ? -1 : 0
    return af - bf || a.priority - b.priority
  })
  return settings.autoRotate || mode === 'safety' || mode === 'auditor' ? ordered : ordered.slice(0, 1)
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('LLM request timed out')), timeoutMs)
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })
  return { signal: controller.signal, cleanup: () => { clearTimeout(timer); signal?.removeEventListener('abort', abort) } }
}

function normalizeUsage(usage: any) {
  if (!usage) return undefined
  const inputTokens = usage.input_tokens ?? usage.prompt_tokens
  const outputTokens = usage.output_tokens ?? usage.completion_tokens
  return { inputTokens, outputTokens, totalTokens: usage.total_tokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0) || undefined) }
}

async function requestOpenAICompatible(baseUrl: string, apiKey: string, model: string, request: LLMRequest, headers: Record<string, string> = {}) {
  if (!model) throw new Error('No model configured for provider')
  const timed = withTimeout(request.signal, DEFAULT_TIMEOUT_MS)
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ model, messages: [...(request.system ? [{ role: 'system', content: request.system }] : []), { role: 'user', content: request.prompt }], temperature: request.temperature ?? 0.2, max_tokens: request.maxTokens ?? 1800 }),
      signal: timed.signal,
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`${response.status}: ${body?.error?.message ?? 'LLM request failed'}`)
    const text = body?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) throw new Error('Provider returned no text')
    return { text, usage: normalizeUsage(body?.usage), raw: body }
  } finally { timed.cleanup() }
}

async function requestAnthropic(provider: LLMProviderConfig, request: LLMRequest) {
  const model = modelFor(provider)
  if (!model) throw new Error('No Anthropic model configured')
  const timed = withTimeout(request.signal, DEFAULT_TIMEOUT_MS)
  try {
    const response = await fetch(`${(provider.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: { 'x-api-key': provider.apiKey ?? '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: request.maxTokens ?? 1800, temperature: request.temperature ?? 0.2, ...(request.system ? { system: request.system } : {}), messages: [{ role: 'user', content: request.prompt }] }),
      signal: timed.signal,
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`${response.status}: ${body?.error?.message ?? 'Anthropic request failed'}`)
    const text = Array.isArray(body?.content) ? body.content.filter((x: unknown): x is { type: string; text: string } => typeof x === 'object' && x !== null && 'type' in x && 'text' in x).filter((x) => x.type === 'text').map((x) => x.text).join('\n') : ''
    if (!text.trim()) throw new Error('Anthropic returned no text')
    return { text, usage: normalizeUsage(body?.usage), raw: body }
  } finally { timed.cleanup() }
}

async function callProvider(provider: LLMProviderConfig, request: LLMRequest) {
  const model = modelFor(provider)
  if (!provider.apiKey?.trim()) throw new Error('Missing provider API key')
  if (provider.provider === 'anthropic') return requestAnthropic(provider, request)
  if (provider.provider === 'openrouter') return requestOpenAICompatible(provider.baseUrl ?? 'https://openrouter.ai/api/v1', provider.apiKey, model, request, { 'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://ubermench.local', 'X-Title': 'Uberm3nch' })
  if (provider.provider === 'openai') return requestOpenAICompatible(provider.baseUrl ?? 'https://api.openai.com/v1', provider.apiKey, model, request)
  throw new Error('Hugging Face uses the dedicated HF inference engine')
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
      return { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, provider: provider.provider, model: modelFor(provider) || 'configured-provider', text: result.text, latencyMs: Math.round(performance.now() - started), attempts, fallbackUsed: attempts > 1, usage: result.usage, raw: result.raw }
    } catch (error) {
      errors.push(`${provider.provider}/${modelFor(provider) || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`)
      if (!settings.autoRotate) break
    }
  }
  throw new Error(`All configured LLM providers failed. ${errors.join(' | ')}`)
}
