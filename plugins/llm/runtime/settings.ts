import type { LLMProvider } from './types'

export type LlmSettings = {
  autoFreeOnly: boolean
  providerOrder: LLMProvider[]
  manuallyConfigured: Partial<Record<LLMProvider, boolean>>
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  autoFreeOnly: true,
  providerOrder: ['openrouter', 'openai', 'anthropic'],
  manuallyConfigured: {},
}

/** API-key values intentionally do not belong in reactive/persisted Nuxt state. */
export function hasConfiguredProvider(settings: LlmSettings, provider: LLMProvider): boolean {
  return settings.manuallyConfigured[provider] === true
}
