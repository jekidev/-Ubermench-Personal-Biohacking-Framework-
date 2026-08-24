import { describe, expect, it, vi } from 'vitest'
import { withRecovery } from './recovery'

describe('agent recovery', () => {
  it('retries transient failures with bounded attempts', async () => {
    let attempts = 0
    const onRetry = vi.fn()
    const result = await withRecovery(async () => {
      attempts += 1
      if (attempts < 3) throw new Error('transient')
      return 'ok'
    }, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 }, onRetry)
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('does not retry beyond the configured cap', async () => {
    let attempts = 0
    await expect(withRecovery(async () => {
      attempts += 1
      throw new Error('permanent')
    }, { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 })).rejects.toThrow('permanent')
    expect(attempts).toBe(2)
  })
})
