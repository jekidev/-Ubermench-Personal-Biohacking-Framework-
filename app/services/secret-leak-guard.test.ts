import { describe, expect, it } from 'vitest'
import { assertNoSecretsInExport, containsLikelySecret } from './secret-leak-guard'
import { createBiologyBackup, serializeBiologyBackup } from './biology-backup'
import { emptyBiologyProfile } from './biology-store'
import { redactSecrets } from './agent-runtime/secret-redaction'
import { createResearchSnapshot } from './research-snapshot'
import { createExperimentBackup } from './experiment-backup'
import type { NormalizedEvidenceRecord } from './evidence-normalizer'

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

  it('blocks experiment backups that contain api keys', async () => {
    await expect(createExperimentBackup([{
      id: 'exp-1',
      subjectId: 'self',
      metric: 'hrv',
      intervention: 'magnesium',
      baselineDays: 7,
      interventionDays: 14,
      washoutDays: 7,
      followupDays: 7,
      startAt: '2026-09-01T00:00:00.000Z',
      design: 'single-subject-crossover',
      runtime: {
        id: 'exp-1',
        intervention: 'magnesium',
        metric: 'hrv',
        baselineDays: 7,
        interventionDays: 14,
        washoutDays: 7,
        observations: [],
        adherence: [],
        adverseEvents: [],
        status: 'planned',
      },
      confounders: [{
        id: 'conf-1',
        recordedAt: '2026-09-07T00:00:00.000Z',
        category: 'other',
        description: 'notes sk-live_secretvalue1234567890',
        severity: 0,
      }],
    }])).rejects.toThrow(/sensitive values/i)
  })

  it('blocks research snapshots that contain bearer tokens', async () => {
    const evidence: NormalizedEvidenceRecord = {
      id: 'doi:10.1000/example',
      title: 'Vitamin D study',
      source: 'europe-pmc',
      evidenceLevel: 'observational',
      confidence: 0.4,
      retrievedAt: '2026-09-07T00:00:00.000Z',
      reviewRequired: true,
      claimUncertainty: 'high',
      mechanisticOnly: false,
    }
    await expect(createResearchSnapshot([evidence], {
      query: 'Bearer leaked-token-abcdefghijklmnop',
    })).rejects.toThrow(/sensitive values/i)
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
