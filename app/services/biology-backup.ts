import type { PersonalBiologyProfile } from '~/types/biology'

export const BIOLOGY_BACKUP_VERSION = 1 as const

export interface BiologyBackup {
  format: 'ubermench-biology-backup'
  version: typeof BIOLOGY_BACKUP_VERSION
  exportedAt: string
  profile: PersonalBiologyProfile
}

export function createBiologyBackup(profile: PersonalBiologyProfile, exportedAt = new Date().toISOString()): BiologyBackup {
  return {
    format: 'ubermench-biology-backup',
    version: BIOLOGY_BACKUP_VERSION,
    exportedAt,
    profile: structuredClone(profile),
  }
}

export function serializeBiologyBackup(backup: BiologyBackup): string {
  return JSON.stringify(backup, null, 2)
}

export function parseBiologyBackup(raw: string): BiologyBackup {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) throw new Error('Invalid Ubermench biology backup')
  if (parsed.format !== 'ubermench-biology-backup' || parsed.version !== BIOLOGY_BACKUP_VERSION) {
    throw new Error('Unsupported Ubermench biology backup version')
  }
  if (!isRecord(parsed.profile) || parsed.profile.version !== 1) {
    throw new Error('Backup does not contain a version 1 biology profile')
  }

  return parsed as unknown as BiologyBackup
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
