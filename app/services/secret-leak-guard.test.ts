import { describe, expect, it } from 'vitest'
import { assertNoSecretsInExport, containsLikelySecret } from './secret-leak-guard'
import { createBiologyBackup, serializeBiologyBackup } from './biology-backup'
import { emptyBiologyProfile } from './biology-store'
import { redactSecrets } from './agent-runtime/secret-redaction'

describe('secret leak guard', () => {
  it('detects api keys and bearer tokens in nested objects', () => {
    const hits = containsLikelySecret({
      profile: { notes: 'Bearer abcdefghijklmnop123456' },
      nested: { apiKey: 'sk-test_abcdefghijklmnopqrstuvwxyz' },
    })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('blocks exports that embed provider secrets', () => {
    expect(() => assertNoSecretsInExport('biology-backup', {
      profile: { goals: ['health'], apiKey: 'sk-live_secretvalue1234567890' },
    })).toThrow(/sensitive values/i)
  })

  it('allows clean biology backups', async () => {
    const backup = await createBiologyBackup(emptyBiologyProfile())
    expect(() => assertNoSecretsInExport('biology-backup', backup)).not.toThrow()
    const serialized = serializeBiologyBackup(backup)
    expect(serialized).not.toContain('sk-')
    expect(serialized).not.toMatch(/Bearer\s+\S{16,}/i)
  })

  it('redacts audit-like payloads before persistence', () => {
    const redacted = redactSecrets({
      detail: 'Authorization: Bearer super-secret-token-123456',
      metadata: { apiKey: 'ghp_abcdefghijklmnopqrstuvwxyz1234', safe: 'ok' },
    }) as { detail: string; metadata: Record<string, string> }
    expect(redacted.detail).not.toContain('super-secret-token-123456')
    expect(redacted.metadata.apiKey).toBe('[REDACTED]')
    expect(redacted.metadata.safe).toBe('ok')
  })
})
