import type { ActiveModel, LLMProvider } from './types'

export type ProviderCandidate = ActiveModel & {
  enabled: boolean
  hasApiKey: boolean
}

export type RotationPolicy = {
  autoFreeOnly: boolean
  providerOrder: LLMProvider[]
  failedProviders?: LLMProvider[]
}

export function selectNextProvider(candidates: readonly ProviderCandidate[], policy: RotationPolicy): ActiveModel | null {
  const order = new Map(policy.providerOrder.map((provider, index) => [provider, index]))
  const failed = new Set(policy.failedProviders ?? [])
  const available = candidates
    .filter((candidate) => candidate.enabled && candidate.hasApiKey)
    .filter((candidate) => !policy.autoFreeOnly || candidate.free)
    .filter((candidate) => !failed.has(candidate.provider))
    .sort((a, b) => (order.get(a.provider) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.provider) ?? Number.MAX_SAFE_INTEGER))

  const first = available[0]
  if (!first) return null
  const { provider, model, free } = first
  return { provider, model, free }
}
