import { discoverOpenRouterFreeModels } from '../../plugins/llm/runtime/openrouter-catalog'
import {
  selectNextProvider,
  type ProviderCandidate,
  type RotationPolicy,
} from '../../plugins/llm/runtime/provider-rotation'
import type { ActiveModel, LLMProvider as PluginLLMProvider } from '../../plugins/llm/runtime/types'
import type { LLMProviderConfig, LLMRequest, LLMSettings } from '~/types/llm'
import { providerHealth } from './agent-runtime/provider-health'

const PLUGIN_PROVIDERS = new Set<PluginLLMProvider>(['openrouter', 'openai', 'anthropic'])
export const OPENROUTER_FREE_MODEL_CACHE_TTL_MS = 15 * 60 * 1000

export type OpenRouterCatalogStatus = {
  available: boolean
  modelCount: number
  models: string[]
  fetchedAt?: string
  stale: boolean
  error?: string
}

let freeModelCache: { key: string; fetchedAt: number; models: string[] } | null = null

export function modelForProvider(provider: LLMProviderConfig): string {
  if (provider.model?.trim()) return provider.model.trim()
  if (provider.provider === 'openrouter') return 'openrouter/free'
  return ''
}

function isFreeModel(provider: LLMProviderConfig, model?: string): boolean {
  const resolved = model ?? modelForProvider(provider)
  return provider.provider === 'openrouter' && (resolved === 'openrouter/free' || resolved.endsWith(':free'))
}

function candidateKey(candidate: Pick<ProviderCandidate, 'provider' | 'model'>): string {
  return `${candidate.provider}:${candidate.model}`
}

async function openRouterFreeModelIds(settings: LLMSettings, force = false): Promise<string[]> {
  const openrouter = settings.providers.find((provider) => provider.provider === 'openrouter' && provider.apiKey?.trim())
  if (!openrouter?.apiKey || !settings.preferFree) return []

  const cacheKey = openrouter.apiKey.slice(-8)
  if (
    !force
    && freeModelCache
    && freeModelCache.key === cacheKey
    && Date.now() - freeModelCache.fetchedAt < OPENROUTER_FREE_MODEL_CACHE_TTL_MS
  ) {
    return freeModelCache.models
  }

  try {
    const models = await discoverOpenRouterFreeModels(openrouter.apiKey)
    const ids = models.slice(0, 12).map((model) => model.id)
    freeModelCache = { key: cacheKey, fetchedAt: Date.now(), models: ids }
    return ids
  } catch {
    return []
  }
}

export function getOpenRouterCatalogStatus(settings: LLMSettings): OpenRouterCatalogStatus {
  const openrouter = settings.providers.find((provider) => provider.provider === 'openrouter' && provider.apiKey?.trim())
  if (!openrouter?.apiKey) {
    return { available: false, modelCount: 0, models: [], stale: true }
  }

  const cacheKey = openrouter.apiKey.slice(-8)
  const cacheValid = Boolean(
    freeModelCache
    && freeModelCache.key === cacheKey
    && Date.now() - freeModelCache.fetchedAt < OPENROUTER_FREE_MODEL_CACHE_TTL_MS,
  )

  return {
    available: true,
    modelCount: cacheValid ? freeModelCache!.models.length : 0,
    models: cacheValid ? freeModelCache!.models : [],
    fetchedAt: cacheValid ? new Date(freeModelCache!.fetchedAt).toISOString() : undefined,
    stale: !cacheValid,
  }
}

export async function refreshOpenRouterCatalog(settings: LLMSettings): Promise<OpenRouterCatalogStatus> {
  const openrouter = settings.providers.find((provider) => provider.provider === 'openrouter' && provider.apiKey?.trim())
  if (!openrouter?.apiKey) {
    return { available: false, modelCount: 0, models: [], stale: true, error: 'Add an OpenRouter API key first.' }
  }

  try {
    const models = await discoverOpenRouterFreeModels(openrouter.apiKey)
    const ids = models.slice(0, 12).map((model) => model.id)
    freeModelCache = { key: openrouter.apiKey.slice(-8), fetchedAt: Date.now(), models: ids }
    return {
      available: true,
      modelCount: ids.length,
      models: ids,
      fetchedAt: new Date(freeModelCache.fetchedAt).toISOString(),
      stale: false,
    }
  } catch (error) {
    return {
      available: true,
      modelCount: 0,
      models: [],
      stale: true,
      error: error instanceof Error ? error.message : 'OpenRouter catalog refresh failed.',
    }
  }
}

export function clearOpenRouterCatalogCache(): void {
  freeModelCache = null
}

export function toProviderCandidates(settings: LLMSettings): ProviderCandidate[] {
  return settings.providers
    .filter((provider) => PLUGIN_PROVIDERS.has(provider.provider as PluginLLMProvider))
    .map((provider) => ({
      provider: provider.provider as PluginLLMProvider,
      model: modelForProvider(provider),
      free: isFreeModel(provider),
      enabled: provider.enabled,
      hasApiKey: Boolean(provider.apiKey?.trim()),
    }))
    .filter((candidate) => providerHealth.isAvailable(candidate.provider))
}

export async function toProviderCandidatesAsync(settings: LLMSettings): Promise<ProviderCandidate[]> {
  const base = toProviderCandidates(settings)
  const freeIds = await openRouterFreeModelIds(settings)
  if (!freeIds.length) return base

  const openrouter = settings.providers.find((provider) => provider.provider === 'openrouter')
  if (!openrouter?.enabled || !openrouter.apiKey?.trim()) return base

  const withoutOpenrouter = base.filter((candidate) => candidate.provider !== 'openrouter')
  const catalogCandidates = freeIds.map((model) => ({
    provider: 'openrouter' as const,
    model,
    free: true,
    enabled: true,
    hasApiKey: true,
  }))
  return [...withoutOpenrouter, ...catalogCandidates]
}

export function toRotationPolicy(
  settings: LLMSettings,
  failedProviders: PluginLLMProvider[] = [],
): RotationPolicy {
  return {
    autoFreeOnly: settings.preferFree,
    providerOrder: settings.providers
      .filter((provider) => PLUGIN_PROVIDERS.has(provider.provider as PluginLLMProvider))
      .sort((left, right) => left.priority - right.priority)
      .map((provider) => provider.provider as PluginLLMProvider),
    failedProviders,
  }
}

export function resolveProviderConfig(settings: LLMSettings, active: ActiveModel): LLMProviderConfig | undefined {
  const base = settings.providers.find((provider) => provider.provider === active.provider)
  if (!base) return undefined
  if (modelForProvider(base) === active.model) return base
  return { ...base, model: active.model }
}

export async function selectProvidersForRequest(
  settings: LLMSettings,
  request: LLMRequest,
): Promise<LLMProviderConfig[]> {
  const candidates = await toProviderCandidatesAsync(settings)
  const hasPreferred = Boolean(request.preferredProvider || request.preferredModel)
  const policy = {
    ...toRotationPolicy(settings),
    autoFreeOnly: hasPreferred ? false : settings.preferFree,
  }
  const preferred = candidates.filter((candidate) => {
    if (request.preferredProvider && candidate.provider !== request.preferredProvider) return false
    if (request.preferredModel && candidate.model !== request.preferredModel) return false
    return true
  })
  const pool = preferred.length ? preferred : candidates
  if (!pool.length) return []

  const ordered: LLMProviderConfig[] = []
  const failedKeys = new Set<string>()
  while (ordered.length < pool.length) {
    const available = pool.filter((candidate) => !failedKeys.has(candidateKey(candidate)))
    const next = selectNextProvider(available, { ...policy, failedProviders: [] })
    if (!next) break
    const config = resolveProviderConfig(settings, next)
    const key = candidateKey(next)
    if (!config || failedKeys.has(key)) {
      failedKeys.add(key)
      continue
    }
    ordered.push(config)
    failedKeys.add(key)
  }

  const forceRotation = request.mode === 'safety' || request.mode === 'auditor'
  if (!settings.autoRotate && !forceRotation) return ordered.slice(0, 1)
  return ordered
}

export async function executeWithRotatingProviders<T>(
  settings: LLMSettings,
  request: LLMRequest,
  execute: (provider: LLMProviderConfig, active: ActiveModel) => Promise<T>,
): Promise<{ value: T; provider: ActiveModel; attempts: number; fallbackUsed: boolean }> {
  const ordered = await selectProvidersForRequest(settings, request)
  if (!ordered.length) throw new Error('No enabled LLM provider with an API key. Unlock the secret vault and add a key in Settings.')

  const forceRotation = request.mode === 'safety' || request.mode === 'auditor'
  let attempts = 0
  let lastError: unknown

  for (const config of ordered) {
    attempts += 1
    const active: ActiveModel = {
      provider: config.provider as PluginLLMProvider,
      model: modelForProvider(config),
      free: isFreeModel(config),
    }
    try {
      const value = await execute(config, active)
      return { value, provider: active, attempts, fallbackUsed: attempts > 1 }
    } catch (error) {
      lastError = error
      if (!settings.autoRotate && !forceRotation) break
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error('All configured LLM providers failed.')
}
