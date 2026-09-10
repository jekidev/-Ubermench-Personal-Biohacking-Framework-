import type { PersonalBiologyProfile } from '~/types/biology'
import { loadBackupStatus, type BackupStatus } from './backup-status'
import { loadExperimentBackupStatus, type ExperimentBackupStatus } from './experiment-backup'
import type { StoredExperimentRecord } from './experiment-backup'
import { summarizeNOf1 } from './experiment-engine'
import { evaluateStoppingRules } from './experiment-stopping-rules'

export type CredentialStorageMode = 'tauri-vault' | 'browser-dev'

export interface ExperimentDiagnostics {
  count: number
  runningCount: number
  triggeredStoppingRules: number
  lowAdherenceCount: number
}

export interface DataHealthDiagnostics {
  credentialStorage: CredentialStorageMode
  biologyBackup: BackupStatus | null
  experimentBackup: ExperimentBackupStatus | null
  experiments: ExperimentDiagnostics
  warnings: string[]
}

function plannedObservationDays(experiment: StoredExperimentRecord) {
  return Math.max(1, experiment.baselineDays + experiment.interventionDays)
}

function missingDataRate(experiment: StoredExperimentRecord, summary: ReturnType<typeof summarizeNOf1>) {
  const planned = plannedObservationDays(experiment)
  const completed = summary.baselineCount + summary.interventionCount
  return Math.max(0, Math.min(1, 1 - completed / planned))
}

export function assessExperimentDiagnostics(experiments: StoredExperimentRecord[]): ExperimentDiagnostics {
  let triggeredStoppingRules = 0
  let lowAdherenceCount = 0

  for (const experiment of experiments) {
    const summary = summarizeNOf1(experiment.runtime)
    const stopping = evaluateStoppingRules({
      severeAdverseEvents: summary.severeAdverseEventCount,
      missingDataRate: missingDataRate(experiment, summary),
      completedVisits: summary.baselineCount + summary.interventionCount,
      plannedVisits: plannedObservationDays(experiment),
    })
    if (stopping.some((rule) => rule.triggered)) triggeredStoppingRules += 1
    if (typeof summary.adherenceRate === 'number' && summary.adherenceRate < 0.7) lowAdherenceCount += 1
  }

  return {
    count: experiments.length,
    runningCount: experiments.filter((item) => item.runtime.status === 'running').length,
    triggeredStoppingRules,
    lowAdherenceCount,
  }
}

export function buildDataHealthDiagnostics(input: {
  profile: PersonalBiologyProfile
  experiments: StoredExperimentRecord[]
  isTauriRuntime: boolean
}): DataHealthDiagnostics {
  const biologyBackup = loadBackupStatus()
  const experimentBackup = loadExperimentBackupStatus()
  const experiments = assessExperimentDiagnostics(input.experiments)
  const warnings: string[] = []

  if (!input.isTauriRuntime) {
    warnings.push('Provider credentials use the browser development path. Use the Tauri desktop app for OS-backed secret storage.')
  }
  if (!biologyBackup?.lastExportedAt) {
    warnings.push('No biology backup export recorded on this device.')
  }
  if (experiments.count > 0 && !experimentBackup?.lastExportedAt) {
    warnings.push('Active experiment protocols exist but no experiment backup has been exported.')
  }
  if (experiments.triggeredStoppingRules > 0) {
    warnings.push(`${experiments.triggeredStoppingRules} protocol(s) have triggered audit-only stopping rules.`)
  }
  if (!input.profile.goals.length) {
    warnings.push('No explicit health goals are configured.')
  }

  return {
    credentialStorage: input.isTauriRuntime ? 'tauri-vault' : 'browser-dev',
    biologyBackup,
    experimentBackup,
    experiments,
    warnings,
  }
}
