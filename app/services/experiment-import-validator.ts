import type { ExperimentBackup, ExperimentBackupMetadata } from './experiment-backup'
import type { StoredExperimentRecord } from './experiment-backup'

export type ExperimentImportIssue = {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export type ExperimentImportPreview = {
  valid: boolean
  issues: ExperimentImportIssue[]
  incoming: StoredExperimentRecord[]
  current: StoredExperimentRecord[]
  metadata?: ExperimentBackupMetadata
  checksum?: string
  exportedAt?: string
  summary: {
    incomingCount: number
    newCount: number
    overwriteCount: number
    localOnlyCount: number
  }
}

export function previewExperimentImport(
  backup: ExperimentBackup,
  currentExperiments: StoredExperimentRecord[],
): ExperimentImportPreview {
  const issues: ExperimentImportIssue[] = []
  const incoming = backup.experiments
  const currentIds = new Set(currentExperiments.map((item) => item.id))
  const incomingIds = new Set(incoming.map((item) => item.id))
  const overwriteCount = incoming.filter((item) => currentIds.has(item.id)).length
  const newCount = incoming.length - overwriteCount
  const localOnlyCount = currentExperiments.filter((item) => !incomingIds.has(item.id)).length

  if (overwriteCount > 0) {
    issues.push({
      field: 'merge',
      message: `${overwriteCount} protocol(s) with matching IDs will replace existing records.`,
      severity: 'warning',
    })
  }

  for (const item of incoming) {
    if (item.runtime.status === 'running' && currentIds.has(item.id)) {
      const current = currentExperiments.find((experiment) => experiment.id === item.id)
      if (current?.runtime.status === 'running') {
        issues.push({
          field: item.id,
          message: `Running protocol "${item.intervention} → ${item.metric}" will be replaced.`,
          severity: 'warning',
        })
      }
    }
  }

  if (incoming.length === 0) {
    issues.push({
      field: 'experiments',
      message: 'Backup contains no experiment protocols.',
      severity: 'error',
    })
  }

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    incoming,
    current: currentExperiments,
    metadata: backup.metadata,
    checksum: backup.checksum,
    exportedAt: backup.exportedAt,
    summary: {
      incomingCount: incoming.length,
      newCount,
      overwriteCount,
      localOnlyCount,
    },
  }
}
