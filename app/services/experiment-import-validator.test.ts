import { describe, expect, it } from 'vitest'
import { createExperimentBackup, type StoredExperimentRecord } from './experiment-backup'
import { applyExperimentImport, previewExperimentImport } from './experiment-import-validator'

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
      status: 'running',
    },
    confounders: [],
  }
}

describe('experiment-import-validator', () => {
  it('summarizes merge counts and warns about overwrites', async () => {
    const backup = await createExperimentBackup([sampleExperiment('exp-1'), sampleExperiment('exp-2')])
    const preview = previewExperimentImport(backup, [sampleExperiment('exp-1')])
    expect(preview.valid).toBe(true)
    expect(preview.summary.incomingCount).toBe(2)
    expect(preview.summary.newCount).toBe(1)
    expect(preview.summary.overwriteCount).toBe(1)
    expect(preview.summary.localOnlyCount).toBe(0)
    expect(preview.issues.some((issue) => issue.field === 'merge')).toBe(true)
  })

  it('blocks empty backups', async () => {
    const backup = await createExperimentBackup([])
    const preview = previewExperimentImport(backup, [])
    expect(preview.valid).toBe(false)
    expect(preview.issues.some((issue) => issue.severity === 'error')).toBe(true)
  })

  it('refuses to apply invalid imports without force', async () => {
    const backup = await createExperimentBackup([])
    const current = [sampleExperiment()]
    expect(() => applyExperimentImport(backup, current)).toThrow(/no experiment protocols/i)
    expect(applyExperimentImport(backup, current, { force: true }).experiments).toEqual(current)
  })

  it('merges incoming protocols while preserving local-only records', async () => {
    const backup = await createExperimentBackup([sampleExperiment('exp-2')])
    const applied = applyExperimentImport(backup, [sampleExperiment('exp-1')])
    expect(applied.experiments.map((item) => item.id).sort()).toEqual(['exp-1', 'exp-2'])
    expect(applied.preview.summary.overwriteCount).toBe(0)
    expect(applied.preview.summary.localOnlyCount).toBe(1)
  })
})
