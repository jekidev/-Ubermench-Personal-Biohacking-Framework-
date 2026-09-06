import type { BiologyBackup, BiologyBackupMetadata } from './biology-backup'
import type { PersonalBiologyProfile } from '~/types/biology'
import { migrateBiologyProfile } from './biology-profile-migration'

export type ImportValidationIssue = {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export type ImportValidationResult = {
  valid: boolean
  issues: ImportValidationIssue[]
  incoming: PersonalBiologyProfile
  current: PersonalBiologyProfile
  metadata?: BiologyBackupMetadata
  checksum?: string
  exportedAt?: string
  summary: {
    biomarkerDelta: number
    medicationDelta: number
    supplementDelta: number
    variantDelta: number
  }
}

export function validateImportCandidate(backup: BiologyBackup, currentProfile: PersonalBiologyProfile): ImportValidationResult {
  const issues: ImportValidationIssue[] = []
  let incoming: PersonalBiologyProfile

  try {
    incoming = migrateBiologyProfile(backup.profile)
  } catch (error) {
    return {
      valid: false,
      issues: [{ field: 'profile', message: error instanceof Error ? error.message : 'Profile migration failed.', severity: 'error' }],
      incoming: currentProfile,
      current: currentProfile,
      metadata: backup.metadata,
      checksum: backup.checksum,
      exportedAt: backup.exportedAt,
      summary: { biomarkerDelta: 0, medicationDelta: 0, supplementDelta: 0, variantDelta: 0 },
    }
  }

  if (!incoming.goals.length && currentProfile.goals.length) {
    issues.push({ field: 'goals', message: 'Import would remove all existing goals.', severity: 'warning' })
  }

  if (incoming.biomarkers.length === 0 && currentProfile.biomarkers.length > 0) {
    issues.push({ field: 'biomarkers', message: 'Import contains no biomarkers but the current profile does.', severity: 'warning' })
  }

  if (incoming.medications.length === 0 && currentProfile.medications.some((item) => item.active)) {
    issues.push({ field: 'medications', message: 'Import would replace active medications with an empty list.', severity: 'warning' })
  }

  const summary = {
    biomarkerDelta: incoming.biomarkers.length - currentProfile.biomarkers.length,
    medicationDelta: incoming.medications.length - currentProfile.medications.length,
    supplementDelta: incoming.supplements.length - currentProfile.supplements.length,
    variantDelta: incoming.variants.length - currentProfile.variants.length,
  }

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    incoming,
    current: currentProfile,
    metadata: backup.metadata,
    checksum: backup.checksum,
    exportedAt: backup.exportedAt,
    summary,
  }
}
