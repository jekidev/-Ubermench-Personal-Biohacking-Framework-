import {
  selectNextProvider,
  type ProviderCandidate,
  type RotationPolicy,
} from '../../plugins/llm/runtime/provider-rotation'
import type { ActiveModel, LLMProvider as PluginLLMProvider } from '../../plugins/llm/runtime/types'
import type { LLMProviderConfig, LLMRequest, LLMSettings } from '~/types/llm'
import { providerHealth } from './agent-runtime/provider-health'

const PLUGIN_PROVIDERS = new Set<PluginLLMProvider>(['openrouter', 'openai', 'anthropic'])

export function modelForProvider(provider: LLMProviderConfig): string {
  if (provider.model?.trim()) return provider.model.trim()
  if (provider.provider === 'openrouter') return 'openrouter/free'
  return ''
}

function isFreeModel(provider: LLMProviderConfig): boolean {
  return provider.provider === 'openrouter' && modelForProvider(provider) === 'openrouter/free'
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

export function findProviderConfig(settings: LLMSettings, active: ActiveModel): LLMProviderConfig | undefined {
  return settings.providers.find(
    (provider) => provider.provider === active.provider && modelForProvider(provider) === active.model,
  ) ?? settings.providers.find((provider) => provider.provider === active.provider)
}

export function selectProvidersForRequest(
  settings: LLMSettings,
  request: LLMRequest,
): LLMProviderConfig[] {
  const candidates = toProviderCandidates(settings)
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
  const failed: PluginLLMProvider[] = []
  while (ordered.length < pool.length) {
    const next = selectNextProvider(pool, { ...policy, failedProviders: failed })
    if (!next) break
    const config = findProviderConfig(settings, next)
    if (!config || ordered.some((item) => item.provider === config.provider && modelForProvider(item) === modelForProvider(config))) {
      failed.push(next.provider)
      continue
    }
    ordered.push(config)
    failed.push(next.provider)
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
  const ordered = selectProvidersForRequest(settings, request)
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
