import type { ExperimentSpec } from './experiment-lifecycle'
import type { ExperimentDesign } from './experiment-protocols'
import type { NOf1Experiment } from './experiment-engine'
import type { ExperimentConfounder } from './experiment-confounders'
import { assertNoSecretsInExport } from './secret-leak-guard'

export const EXPERIMENT_BACKUP_VERSION = 1 as const
export const EXPERIMENT_BACKUP_STATUS_KEY = 'ubermench.experiment.backup-status.v1'

export type StoredExperimentRecord = ExperimentSpec & {
  design: ExperimentDesign
  runtime: NOf1Experiment
  confounders: ExperimentConfounder[]
}

export interface ExperimentBackupMetadata {
  experimentCount: number
  runningCount: number
  exportedBy?: string
}

export interface ExperimentBackup {
  format: 'ubermench-experiment-backup'
  version: typeof EXPERIMENT_BACKUP_VERSION
  exportedAt: string
  experiments: StoredExperimentRecord[]
  checksum?: string
  metadata?: ExperimentBackupMetadata
}

export interface ExperimentBackupStatus {
  lastExportedAt?: string
  lastChecksumPrefix?: string
  experimentCount?: number
  format?: string
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function cloneExperiments(experiments: StoredExperimentRecord[]): StoredExperimentRecord[] {
  return JSON.parse(JSON.stringify(experiments)) as StoredExperimentRecord[]
}

export function buildExperimentBackupMetadata(experiments: StoredExperimentRecord[]): ExperimentBackupMetadata {
  return {
    experimentCount: experiments.length,
    runningCount: experiments.filter((item) => item.runtime.status === 'running').length,
    exportedBy: 'ubermench-personal-biohacking-framework',
  }
}

export async function computeExperimentBackupChecksum(experiments: StoredExperimentRecord[]): Promise<string> {
  return sha256Hex(JSON.stringify(experiments))
}

export async function createExperimentBackup(
  experiments: StoredExperimentRecord[],
  exportedAt = new Date().toISOString(),
): Promise<ExperimentBackup> {
  const cloned = cloneExperiments(experiments)
  assertNoSecretsInExport('experiment-backup', cloned)
  const checksum = await computeExperimentBackupChecksum(cloned)
  return {
    format: 'ubermench-experiment-backup',
    version: EXPERIMENT_BACKUP_VERSION,
    exportedAt,
    experiments: cloned,
    checksum,
    metadata: buildExperimentBackupMetadata(cloned),
  }
}

export function serializeExperimentBackup(backup: ExperimentBackup): string {
  return JSON.stringify(backup, null, 2)
}

export async function parseExperimentBackup(raw: string): Promise<ExperimentBackup> {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) throw new Error('Invalid Ubermench experiment backup')
  if (parsed.format !== 'ubermench-experiment-backup' || parsed.version !== EXPERIMENT_BACKUP_VERSION) {
    throw new Error('Unsupported Ubermench experiment backup version')
  }
  if (!Array.isArray(parsed.experiments)) {
    throw new Error('Backup does not contain experiment records')
  }

  const backup = parsed as unknown as ExperimentBackup
  backup.experiments = cloneExperiments(backup.experiments)
  assertNoSecretsInExport('experiment-backup', backup.experiments)

  if (backup.checksum) {
    const expected = await computeExperimentBackupChecksum(backup.experiments)
    if (expected !== backup.checksum) throw new Error('Experiment backup checksum mismatch')
  }

  return backup
}

export function recordExperimentBackupExport(status: ExperimentBackupStatus): ExperimentBackupStatus {
  const next: ExperimentBackupStatus = {
    lastExportedAt: status.lastExportedAt ?? new Date().toISOString(),
    lastChecksumPrefix: status.lastChecksumPrefix,
    experimentCount: status.experimentCount,
    format: status.format ?? 'ubermench-experiment-backup',
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(EXPERIMENT_BACKUP_STATUS_KEY, JSON.stringify(next))
  }
  return next
}

export function loadExperimentBackupStatus(): ExperimentBackupStatus | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(EXPERIMENT_BACKUP_STATUS_KEY)
    return raw ? JSON.parse(raw) as ExperimentBackupStatus : null
  } catch {
    return null
  }
}

export function describeExperimentBackupStatus(status: ExperimentBackupStatus | null): string {
  if (!status?.lastExportedAt) return 'No experiment backup has been exported from this browser yet.'
  const when = Number.isNaN(Date.parse(status.lastExportedAt))
    ? status.lastExportedAt
    : new Date(status.lastExportedAt).toISOString().slice(0, 10)
  const checksum = status.lastChecksumPrefix ? ` Checksum ${status.lastChecksumPrefix}…` : ''
  const count = typeof status.experimentCount === 'number' ? ` ${status.experimentCount} protocols.` : ''
  return `Last export ${when}.${checksum}${count}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
