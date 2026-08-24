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
})
