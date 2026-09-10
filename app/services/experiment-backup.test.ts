import { describe, expect, it } from 'vitest'
import {
  createExperimentBackup,
  parseExperimentBackup,
  serializeExperimentBackup,
  type StoredExperimentRecord,
} from './experiment-backup'
import { assertNoSecretsInExport } from './secret-leak-guard'

function sampleExperiment(id = 'exp-1'): StoredExperimentRecord {
  return {
    id,
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
      id,
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
    confounders: [],
  }
}

describe('experiment-backup', () => {
  it('creates a versioned backup with checksum and metadata', async () => {
    const backup = await createExperimentBackup([sampleExperiment()], '2026-09-07T00:00:00.000Z')
    expect(backup.format).toBe('ubermench-experiment-backup')
    expect(backup.version).toBe(1)
    expect(backup.checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(backup.metadata?.experimentCount).toBe(1)
  })

  it('round-trips through serialize and parse', async () => {
    const original = await createExperimentBackup([sampleExperiment()])
    const parsed = await parseExperimentBackup(serializeExperimentBackup(original))
    expect(parsed.experiments).toEqual(original.experiments)
    expect(parsed.checksum).toBe(original.checksum)
  })

  it('rejects backups with checksum mismatch', async () => {
    const backup = await createExperimentBackup([sampleExperiment()])
    const first = backup.experiments[0]
    if (!first) throw new Error('expected experiment record')
    first.intervention = 'changed'
    await expect(parseExperimentBackup(serializeExperimentBackup(backup))).rejects.toThrow(/checksum mismatch/i)
  })

  it('blocks exports that embed provider secrets', async () => {
    const experiment = sampleExperiment()
    experiment.confounders.push({
      id: 'conf-1',
      recordedAt: '2026-09-07T00:00:00.000Z',
      category: 'other',
      description: 'Bearer leaked-token-abcdefghijklmnop',
      severity: 1,
    })
    await expect(createExperimentBackup([experiment])).rejects.toThrow(/sensitive values/i)
    expect(() => assertNoSecretsInExport('experiment-backup', [experiment])).toThrow(/sensitive values/i)
  })
})
