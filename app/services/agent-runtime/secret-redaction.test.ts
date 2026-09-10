import { describe, expect, it } from 'vitest'
import { redactSecrets } from './secret-redaction'

describe('secret redaction', () => {
  it('redacts common bearer and api-key shapes', () => {
    const input = 'Authorization: Bearer super-secret-token-123456 and key sk-test_abcdefghijklmnopqrstuvwxyz'
    expect(redactSecrets(input)).not.toContain('super-secret-token-123456')
    expect(redactSecrets(input)).not.toContain('sk-test_abcdefghijklmnopqrstuvwxyz')
  })

  it('redacts sensitive object keys recursively', () => {
    expect(redactSecrets({ token: 'abc', nested: { password: 'secret', safe: 'ok' } })).toEqual({
      token: '[REDACTED]',
      nested: { password: '[REDACTED]', safe: 'ok' },
    })
  })

  it('redacts model error payloads and audit metadata', () => {
    const redacted = redactSecrets({
      message: 'OpenRouter failed with sk-or-v1_abcdefghijklmnopqrstuvwxyz',
      metadata: {
        authorization: 'Bearer provider-token-abcdefghijklmnop',
        requestId: 'req-1',
      },
    }) as { message: string; metadata: Record<string, string> }
    expect(redacted.message).not.toContain('sk-or-v1_abcdefghijklmnopqrstuvwxyz')
    expect(redacted.metadata.authorization).toBe('[REDACTED]')
    expect(redacted.metadata.requestId).toBe('req-1')
  })
})
