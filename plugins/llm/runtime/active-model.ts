import { selectNextProvider, type ProviderCandidate, type RotationPolicy } from './provider-rotation'
import type { ActiveModel } from './types'

export type ActiveModelState = {
  active: ActiveModel | null
  availableProviders: ProviderCandidate[]
}

export function resolveActiveModel(candidates: readonly ProviderCandidate[], policy: RotationPolicy): ActiveModelState {
  const availableProviders = candidates.filter((candidate) => candidate.enabled && candidate.hasApiKey && (!policy.autoFreeOnly || candidate.free))
  return {
    active: selectNextProvider(availableProviders, policy),
    availableProviders,
  }
}
