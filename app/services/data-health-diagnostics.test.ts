import { describe, expect, it } from 'vitest'
import { assessExperimentDiagnostics, buildDataHealthDiagnostics } from './data-health-diagnostics'
import type { StoredExperimentRecord } from './experiment-backup'
import { emptyBiologyProfile } from './biology-store'

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
      adherence: [{ plannedAt: '2026-09-02T00:00:00.000Z', completed: false }],
      adverseEvents: [{ recordedAt: '2026-09-03T00:00:00.000Z', severity: 'severe', description: 'headache' }],
      status: 'running',
    },
    confounders: [],
  }
}

describe('data-health-diagnostics', () => {
  it('counts triggered stopping rules and low adherence', () => {
    const stats = assessExperimentDiagnostics([sampleExperiment()])
    expect(stats.count).toBe(1)
    expect(stats.runningCount).toBe(1)
    expect(stats.triggeredStoppingRules).toBe(1)
    expect(stats.lowAdherenceCount).toBe(1)
  })

  it('warns about browser credential path and missing backups', () => {
    const diagnostics = buildDataHealthDiagnostics({
      profile: emptyBiologyProfile(),
      experiments: [sampleExperiment()],
      isTauriRuntime: false,
    })
    expect(diagnostics.credentialStorage).toBe('browser-dev')
    expect(diagnostics.warnings.some((warning) => warning.includes('browser local vault'))).toBe(true)
    expect(diagnostics.warnings.some((warning) => warning.includes('experiment backup'))).toBe(true)
    expect(diagnostics.warnings.some((warning) => warning.includes('stopping rules'))).toBe(true)
  })
})
