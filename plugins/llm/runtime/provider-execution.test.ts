import { describe, expect, it, vi } from 'vitest'
import { executeProviderRequest } from './provider-execution'
import type { ApprovalToken } from '../security/scoped-approval'

const request = { provider: 'openrouter', target: 'https://api.openrouter.ai/chat/completions', payload: { model: 'example', input: 'hello' } }

function token(overrides: Partial<ApprovalToken> = {}): ApprovalToken {
  return {
    action: 'send',
    target: request.target,
    payloadHash: JSON.stringify(request.payload, Object.keys(request.payload).sort()),
    expiresAt: Date.now() + 60_000,
    used: false,
    ...overrides,
  }
}

describe('provider execution approval enforcement', () => {
  it('does not invoke the provider without a token', async () => {
    const adapter = vi.fn()
    await expect(executeProviderRequest(request, undefined, adapter)).rejects.toThrow(/approval token/)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('rejects expired tokens before network execution', async () => {
    const adapter = vi.fn()
    await expect(executeProviderRequest(request, token({ expiresAt: Date.now() - 1 }), adapter)).rejects.toThrow(/expired/)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('rejects target mismatch', async () => {
    const adapter = vi.fn()
    await expect(executeProviderRequest(request, token({ target: 'https://example.invalid' }), adapter)).rejects.toThrow(/does not match/)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('consumes a valid token once', async () => {
    const adapter = vi.fn().mockResolvedValue({ ok: true })
    const approval = token()
    await expect(executeProviderRequest(request, approval, adapter)).resolves.toEqual({ ok: true })
    expect(adapter).toHaveBeenCalledTimes(1)
    await expect(executeProviderRequest(request, approval, adapter)).rejects.toThrow(/already been consumed/)
    expect(adapter).toHaveBeenCalledTimes(1)
  })
})
