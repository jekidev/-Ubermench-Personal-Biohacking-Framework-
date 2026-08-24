import type { ActiveModel, LLMProvider } from './types'

export type ProviderRuntimeState =
  | 'idle'
  | 'pending-approval'
  | 'ready'
  | 'running'
  | 'failed'
  | 'exhausted'

export type ProviderRuntimeStatus = {
  state: ProviderRuntimeState
  activeProvider?: LLMProvider
  activeModel?: string
  free?: boolean
  attempts: Array<{
    provider: LLMProvider
    model: string
    ok: boolean
  }>
  error?: string
}

export function pendingProviderStatus(model: ActiveModel): ProviderRuntimeStatus {
  return {
    state: 'pending-approval',
    activeProvider: model.provider,
    activeModel: model.model,
    free: model.free,
    attempts: [],
  }
}

export function runningProviderStatus(model: ActiveModel, attempts = []): ProviderRuntimeStatus {
  return {
    state: 'running',
    activeProvider: model.provider,
    activeModel: model.model,
    free: model.free,
    attempts,
  }
}

export function exhaustedProviderStatus(attempts: ProviderRuntimeStatus['attempts'], error: string): ProviderRuntimeStatus {
  return { state: 'exhausted', attempts, error }
}
