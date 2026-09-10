import { describe, expect, it } from 'vitest'
import {
  createExperimentBackup,
  parseExperimentBackup,
  serializeExperimentBackup,
  type StoredExperimentRecord,
} from './experiment-backup'
import { applyExperimentImport, previewExperimentImport } from './experiment-import-validator'

function sampleExperiment(id = 'exp-1', intervention = 'magnesium'): StoredExperimentRecord {
  return {
    id,
    subjectId: 'self',
    metric: 'hrv',
    intervention,
    baselineDays: 7,
    interventionDays: 14,
    washoutDays: 7,
    followupDays: 7,
    startAt: '2026-09-01T00:00:00.000Z',
    design: 'single-subject-crossover',
    runtime: {
      id,
      intervention,
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

describe('experiment backup lifecycle', () => {
  it('create -> export -> clear -> preview -> confirm -> verify', async () => {
    const original = [sampleExperiment('exp-1', 'magnesium'), sampleExperiment('exp-2', 'creatine')]
    const backup = await createExperimentBackup(original, '2026-09-07T00:00:00.000Z')
    const exported = serializeExperimentBackup(backup)
    const cleared: StoredExperimentRecord[] = []
    expect(cleared).toHaveLength(0)

    const parsed = await parseExperimentBackup(exported)
    const preview = previewExperimentImport(parsed, cleared)
    expect(preview.valid).toBe(true)
    expect(preview.summary.incomingCount).toBe(2)
    expect(preview.checksum).toBe(backup.checksum)
    expect(preview.metadata?.experimentCount).toBe(2)

    const applied = applyExperimentImport(parsed, cleared)
    expect(applied.experiments).toHaveLength(2)
    expect(applied.experiments.find((item) => item.id === 'exp-1')?.intervention).toBe('magnesium')
    expect(applied.experiments.find((item) => item.id === 'exp-2')?.intervention).toBe('creatine')
  })

  it('rejects replacing protocols when import validation fails', async () => {
    const current = [sampleExperiment('exp-keep')]
    const invalid = await createExperimentBackup([])
    const preview = previewExperimentImport(invalid, current)
    expect(preview.valid).toBe(false)
    expect(() => applyExperimentImport(invalid, current)).toThrow(/no experiment protocols/i)
    expect(applyExperimentImport(invalid, current, { force: true }).experiments).toEqual(current)
  })

  it('warns about overwrites but still merges after preview', async () => {
    const current = [sampleExperiment('exp-1', 'local-only')]
    const backup = await createExperimentBackup([sampleExperiment('exp-1', 'incoming')])
    const preview = previewExperimentImport(backup, current)
    expect(preview.valid).toBe(true)
    expect(preview.summary.overwriteCount).toBe(1)
    expect(preview.issues.some((issue) => issue.field === 'merge')).toBe(true)

    const applied = applyExperimentImport(backup, current)
    expect(applied.experiments).toHaveLength(1)
    expect(applied.experiments[0]?.intervention).toBe('incoming')
  })
})
