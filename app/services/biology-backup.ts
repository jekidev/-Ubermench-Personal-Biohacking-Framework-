import type { PersonalBiologyProfile } from '~/types/biology'

export const BIOLOGY_BACKUP_VERSION = 1 as const

export interface BiologyBackupMetadata {
  biomarkerCount: number
  medicationCount: number
  supplementCount: number
  variantCount: number
  exportedBy?: string
}

export interface BiologyBackup {
  format: 'ubermench-biology-backup'
  version: typeof BIOLOGY_BACKUP_VERSION
  exportedAt: string
  profile: PersonalBiologyProfile
  checksum?: string
  metadata?: BiologyBackupMetadata
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function buildBiologyBackupMetadata(profile: PersonalBiologyProfile): BiologyBackupMetadata {
  return {
    biomarkerCount: profile.biomarkers.length,
    medicationCount: profile.medications.length,
    supplementCount: profile.supplements.length,
    variantCount: profile.variants.length,
    exportedBy: 'ubermench-personal-biohacking-framework',
  }
}

export async function computeBiologyBackupChecksum(profile: PersonalBiologyProfile): Promise<string> {
  return sha256Hex(JSON.stringify(profile))
}

export async function createBiologyBackup(profile: PersonalBiologyProfile, exportedAt = new Date().toISOString()): Promise<BiologyBackup> {
  const cloned = structuredClone(profile)
  const checksum = await computeBiologyBackupChecksum(cloned)
  return {
    format: 'ubermench-biology-backup',
    version: BIOLOGY_BACKUP_VERSION,
    exportedAt,
    profile: cloned,
    checksum,
    metadata: buildBiologyBackupMetadata(cloned),
  }
}

export function serializeBiologyBackup(backup: BiologyBackup): string {
  return JSON.stringify(backup, null, 2)
}

export async function parseBiologyBackup(raw: string): Promise<BiologyBackup> {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) throw new Error('Invalid Ubermench biology backup')
  if (parsed.format !== 'ubermench-biology-backup' || parsed.version !== BIOLOGY_BACKUP_VERSION) {
    throw new Error('Unsupported Ubermench biology backup version')
  }
  if (!isRecord(parsed.profile) || parsed.profile.version !== 1) {
    throw new Error('Backup does not contain a version 1 biology profile')
  }

  const backup = parsed as unknown as BiologyBackup
  if (backup.checksum) {
    const expected = await computeBiologyBackupChecksum(backup.profile)
    if (expected !== backup.checksum) throw new Error('Biology backup checksum mismatch')
  }

  return backup
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
