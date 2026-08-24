import type { ActiveModel, LLMProvider } from './types'

export type ProviderCandidate = ActiveModel & {
  enabled: boolean
  hasApiKey: boolean
}

export type RotationPolicy = {
  autoFreeOnly: boolean
  providerOrder: LLMProvider[]
}

export function selectNextProvider(candidates: readonly ProviderCandidate[], policy: RotationPolicy): ActiveModel | null {
  const order = new Map(policy.providerOrder.map((provider, index) => [provider, index]))
  const available = candidates
    .filter((candidate) => candidate.enabled && candidate.hasApiKey)
    .filter((candidate) => !policy.autoFreeOnly || candidate.free)
    .sort((a, b) => (order.get(a.provider) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.provider) ?? Number.MAX_SAFE_INTEGER))

  if (!available.length) return null
  const { provider, model, free } = available[0]
  return { provider, model, free }
}
