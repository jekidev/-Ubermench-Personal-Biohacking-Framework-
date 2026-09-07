export const BACKUP_STATUS_STORAGE_KEY = 'ubermench.biology.backup-status.v1'

export interface BackupStatus {
  lastExportedAt?: string
  lastChecksumPrefix?: string
  biomarkerCount?: number
  format?: string
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStore(): KeyValueStore | undefined {
  if (typeof localStorage === 'undefined') return undefined
  return localStorage
}

export function loadBackupStatus(store: KeyValueStore | undefined = defaultStore()): BackupStatus | null {
  if (!store) return null
  try {
    const raw = store.getItem(BACKUP_STATUS_STORAGE_KEY)
    return raw ? JSON.parse(raw) as BackupStatus : null
  } catch {
    return null
  }
}

export function recordBackupExport(status: BackupStatus, store: KeyValueStore | undefined = defaultStore()): BackupStatus {
  const next: BackupStatus = {
    lastExportedAt: status.lastExportedAt ?? new Date().toISOString(),
    lastChecksumPrefix: status.lastChecksumPrefix,
    biomarkerCount: status.biomarkerCount,
    format: status.format ?? 'ubermench-biology-backup',
  }
  store?.setItem(BACKUP_STATUS_STORAGE_KEY, JSON.stringify(next))
  return next
}

export function describeBackupStatus(status: BackupStatus | null): string {
  if (!status?.lastExportedAt) return 'No biology backup has been exported from this browser yet.'
  const when = Number.isNaN(Date.parse(status.lastExportedAt)) ? status.lastExportedAt : new Date(status.lastExportedAt).toISOString().slice(0, 10)
  const checksum = status.lastChecksumPrefix ? ` Checksum ${status.lastChecksumPrefix}…` : ''
  return `Last export ${when}.${checksum}`
}
