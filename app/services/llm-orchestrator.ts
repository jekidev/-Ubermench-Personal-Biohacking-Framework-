import type { LLMMode, LLMProviderConfig, LLMRequest, LLMResponse, LLMSettings } from '~/types/llm'
import { DEFAULT_LLM_SETTINGS } from '~/types/llm'
import { providerHealth } from './agent-runtime/provider-health'
import { executeWithRotatingProviders, modelForProvider } from './llm-provider-bridge'

const STORAGE_KEY = 'ubermensch-llm-settings-v1'
const SECRET_STORAGE_KEY = 'ubermensch-llm-session-keys-v1'
const DEFAULT_TIMEOUT_MS = 45_000

type PersistedLLMSettings = Omit<LLMSettings, 'providers'> & { providers: Array<Omit<LLMProviderConfig, 'apiKey'> & { apiKey?: never }> }
type AnthropicContentBlock = { type: string; text: string }

function isTauriRuntime(): boolean { return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window }
function readSessionKeys(): Record<string, string> { if (isTauriRuntime() || import.meta.server || typeof sessionStorage === 'undefined') return {}; try { const value = JSON.parse(sessionStorage.getItem(SECRET_STORAGE_KEY) ?? '{}'); return value && typeof value === 'object' ? value as Record<string, string> : {} } catch { return {} } }
function writeSessionKeys(settings: LLMSettings) { if (isTauriRuntime() || import.meta.server || typeof sessionStorage === 'undefined') return; try { sessionStorage.setItem(SECRET_STORAGE_KEY, JSON.stringify(Object.fromEntries(settings.providers.filter((p) => p.apiKey?.trim()).map((p) => [p.provider, p.apiKey])))) } catch { /* ignore */ } }
function sanitizeForStorage(settings: LLMSettings): PersistedLLMSettings { return { preferFree: settings.preferFree, autoRotate: settings.autoRotate, showModel: settings.showModel, allowFrameworkWrite: settings.allowFrameworkWrite, providers: settings.providers.map(({ apiKey: _apiKey, ...provider }) => provider) } }
export function loadLLMSettings(): LLMSettings { if (import.meta.server || typeof localStorage === 'undefined') return structuredClone(DEFAULT_LLM_SETTINGS); try { const raw = localStorage.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) as Partial<PersistedLLMSettings> : {}; const sessionKeys = readSessionKeys(); return { ...structuredClone(DEFAULT_LLM_SETTINGS), ...parsed, providers: Array.isArray(parsed.providers) ? parsed.providers.map((stored) => ({ ...structuredClone(DEFAULT_LLM_SETTINGS.providers.find((p) => p.provider === stored.provider) ?? { provider: stored.provider, enabled: false, priority: 99 }), ...stored, apiKey: sessionKeys[stored.provider] })) : structuredClone(DEFAULT_LLM_SETTINGS.providers).map((p) => ({ ...p, apiKey: sessionKeys[p.provider] })) } } catch { return structuredClone(DEFAULT_LLM_SETTINGS) } }
export function saveLLMSettings(settings: LLMSettings) { if (import.meta.server || typeof localStorage === 'undefined') return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeForStorage(settings))); writeSessionKeys(settings) } catch { /* keep memory state */ } }
export function clearLLMSessionKeys() { if (typeof sessionStorage === 'undefined' || isTauriRuntime()) return; try { sessionStorage.removeItem(SECRET_STORAGE_KEY) } catch { /* ignore */ } }
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(new Error('LLM request timed out')), timeoutMs); const abort = () => controller.abort(signal?.reason); if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true }); return { signal: controller.signal, cleanup: () => { clearTimeout(timer); signal?.removeEventListener('abort', abort) } } }
function normalizeUsage(usage: any) { if (!usage) return undefined; const inputTokens = usage.input_tokens ?? usage.prompt_tokens; const outputTokens = usage.output_tokens ?? usage.completion_tokens; return { inputTokens, outputTokens, totalTokens: usage.total_tokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0) || undefined) } }
async function requestOpenAICompatible(baseUrl: string, apiKey: string, model: string, request: LLMRequest, headers: Record<string, string> = {}) { if (!model) throw new Error('No model configured for provider'); const timed = withTimeout(request.signal, DEFAULT_TIMEOUT_MS); try { const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ model, messages: [...(request.system ? [{ role: 'system', content: request.system }] : []), { role: 'user', content: request.prompt }], temperature: request.temperature ?? 0.2, max_tokens: request.maxTokens ?? 1800 }), signal: timed.signal }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`${response.status}: ${body?.error?.message ?? 'LLM request failed'}`); const text = body?.choices?.[0]?.message?.content; if (typeof text !== 'string' || !text.trim()) throw new Error('Provider returned no text'); return { text, usage: normalizeUsage(body?.usage), raw: body } } finally { timed.cleanup() } }
async function requestAnthropic(provider: LLMProviderConfig, request: LLMRequest) { const model = modelForProvider(provider); if (!model) throw new Error('No Anthropic model configured'); const timed = withTimeout(request.signal, DEFAULT_TIMEOUT_MS); try { const response = await fetch(`${(provider.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '')}/messages`, { method: 'POST', headers: { 'x-api-key': provider.apiKey ?? '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model, max_tokens: request.maxTokens ?? 1800, temperature: request.temperature ?? 0.2, ...(request.system ? { system: request.system } : {}), messages: [{ role: 'user', content: request.prompt }] }), signal: timed.signal }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`${response.status}: ${body?.error?.message ?? 'Anthropic request failed'}`); const text = Array.isArray(body?.content) ? body.content.filter((x: unknown): x is AnthropicContentBlock => typeof x === 'object' && x !== null && 'type' in x && 'text' in x && typeof (x as { type?: unknown }).type === 'string' && typeof (x as { text?: unknown }).text === 'string').filter((x: AnthropicContentBlock) => x.type === 'text').map((x: AnthropicContentBlock) => x.text).join('\n') : ''; if (!text.trim()) throw new Error('Anthropic returned no text'); return { text, usage: normalizeUsage(body?.usage), raw: body } } finally { timed.cleanup() } }
async function callProvider(provider: LLMProviderConfig, request: LLMRequest) { const model = modelForProvider(provider); if (!provider.apiKey?.trim()) throw new Error('Missing provider API key'); if (provider.provider === 'anthropic') return requestAnthropic(provider, request); if (provider.provider === 'openrouter') return requestOpenAICompatible(provider.baseUrl ?? 'https://openrouter.ai/api/v1', provider.apiKey, model, request, { 'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://ubermensch.local', 'X-Title': 'Uberm3nch' }); if (provider.provider === 'openai') return requestOpenAICompatible(provider.baseUrl ?? 'https://api.openai.com/v1', provider.apiKey, model, request); throw new Error('Hugging Face uses the dedicated HF inference engine') }

export async function orchestrateLLM(request: LLMRequest, settings = loadLLMSettings()): Promise<LLMResponse> {
  const started = performance.now()
  const errors: string[] = []

  try {
    const { value: result, provider: active, attempts, fallbackUsed } = await executeWithRotatingProviders(
      settings,
      request,
      async (provider) => {
        try {
          const response = await callProvider(provider, request)
          providerHealth.recordSuccess(provider.provider)
          return response
        } catch (error) {
          providerHealth.recordFailure(provider.provider)
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`${provider.provider}/${modelForProvider(provider) || 'unknown'}: ${message}`)
          throw error
        }
      },
    )

    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      provider: active.provider,
      model: active.model || 'configured-provider',
      text: result.text,
      latencyMs: Math.round(performance.now() - started),
      attempts,
      fallbackUsed,
      usage: result.usage,
      raw: result.raw,
    }
  } catch (error) {
    if (errors.length) {
      throw new Error(`All configured LLM providers failed. ${errors.join(' | ')}`)
    }
    throw error
  }
}
