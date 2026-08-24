import type { ActiveModel, LLMProvider } from './types'
import { selectNextProvider, type ProviderCandidate, type RotationPolicy } from './provider-rotation'

export type ProviderAttemptResult<T> = {
  provider: ActiveModel
  value?: T
  error?: unknown
}

export type ProviderExecutor<T> = (provider: ActiveModel) => Promise<T>

/**
 * Selects and executes providers in configured order. Every executor call is
 * expected to already be behind the approval-first provider execution gate.
 */
export async function executeWithProviderFallback<T>(
  candidates: readonly ProviderCandidate[],
  policy: RotationPolicy,
  execute: ProviderExecutor<T>,
): Promise<{ value: T; provider: ActiveModel; attempts: ProviderAttemptResult<T>[] }> {
  const failedProviders: LLMProvider[] = [...(policy.failedProviders ?? [])]
  const attempts: ProviderAttemptResult<T>[] = []

  while (true) {
    const next = selectNextProvider(candidates, { ...policy, failedProviders })
    if (!next) throw new Error('No eligible LLM provider is available.')

    try {
      const value = await execute(next)
      attempts.push({ provider: next, value })
      return { value, provider: next, attempts }
    } catch (error) {
      attempts.push({ provider: next, error })
      if (failedProviders.includes(next.provider)) break
      failedProviders.push(next.provider)
    }
  }

  throw new Error('All eligible LLM providers failed.')
}
