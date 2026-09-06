import type { BiomarkerRecord, PersonalBiologyProfile } from '~/types/biology'
import { emptyBiologyProfile, loadBiologyProfile, saveBiologyProfile, clearBiologyProfile } from '~/services/biology-store'
import { calculateBiomarkerTrend, getBiomarkerNames } from '~/services/biomarker-engine'
import { screenInteractions } from '~/services/interaction-engine'
import { createBiologyBackup, parseBiologyBackup, serializeBiologyBackup } from '~/services/biology-backup'
import { validateImportCandidate, type ImportValidationResult } from '~/services/biology-import-validator'
import { migrateBiologyProfile } from '~/services/biology-profile-migration'
import { encryptBiologyBackup, decryptBiologyBackup, parseEncryptedBiologyBackup, serializeEncryptedBiologyBackup } from '~/services/encrypted-biology-backup'
import { loadBiologyBackupNative, saveBiologyBackupNative } from '~/services/biology-backup-native'
import { loadEncryptedBiologyBackupNative, saveEncryptedBiologyBackupNative } from '~/services/encrypted-biology-backup-native'
import { recordBackupExport } from '~/services/backup-status'

export function usePersonalBiology() {
  const profile = useState<PersonalBiologyProfile>('personal-biology-profile', () => emptyBiologyProfile())
  const initialized = useState<boolean>('personal-biology-initialized', () => false)
  const initializing = useState<boolean>('personal-biology-initializing', () => false)

  async function initialize() {
    if (initialized.value || initializing.value) return
    initializing.value = true
    try {
      profile.value = await loadBiologyProfile()
      initialized.value = true
    } finally {
      initializing.value = false
    }
  }

  async function persist(next: PersonalBiologyProfile) {
    profile.value = { ...next, updatedAt: new Date().toISOString() }
    await saveBiologyProfile(profile.value)
  }

  async function addBiomarker(record: BiomarkerRecord) {
    await persist({ ...profile.value, biomarkers: [...profile.value.biomarkers, record] })
  }

  function rememberBackup(exportedAt: string, checksum?: string, biomarkerCount?: number) {
    recordBackupExport({
      lastExportedAt: exportedAt,
      lastChecksumPrefix: checksum?.slice(0, 12),
      biomarkerCount,
    })
  }

  async function exportBackup() {
    const backup = await createBiologyBackup(profile.value)
    rememberBackup(backup.exportedAt, backup.checksum, backup.metadata?.biomarkerCount)
    return serializeBiologyBackup(backup)
  }

  async function exportBackupToFile() {
    const backup = await createBiologyBackup(profile.value)
    rememberBackup(backup.exportedAt, backup.checksum, backup.metadata?.biomarkerCount)
    return saveBiologyBackupNative(backup)
  }

  async function importBackup(raw: string, options?: { force?: boolean }) {
    const backup = await parseBiologyBackup(raw)
    const validation = validateImportCandidate(backup, profile.value)
    if (!validation.valid && !options?.force) {
      throw new Error(validation.issues.map((issue) => issue.message).join(' '))
    }
    await persist(validation.incoming)
    return validation
  }

  async function previewImport(raw: string): Promise<ImportValidationResult> {
    const backup = await parseBiologyBackup(raw)
    return validateImportCandidate(backup, profile.value)
  }

  async function importBackupFromFile(options?: { force?: boolean }) {
    const backup = await loadBiologyBackupNative()
    if (!backup) return false
    const validation = validateImportCandidate(backup, profile.value)
    if (!validation.valid && !options?.force) {
      throw new Error(validation.issues.map((issue) => issue.message).join(' '))
    }
    await persist(validation.incoming)
    return validation
  }

  async function exportEncryptedBackup(passphrase: string) {
    const backup = await createBiologyBackup(profile.value)
    rememberBackup(backup.exportedAt, backup.checksum, backup.metadata?.biomarkerCount)
    return serializeEncryptedBiologyBackup(await encryptBiologyBackup(backup, passphrase))
  }

  async function exportEncryptedBackupToFile(passphrase: string) {
    const backup = await createBiologyBackup(profile.value)
    rememberBackup(backup.exportedAt, backup.checksum, backup.metadata?.biomarkerCount)
    return saveEncryptedBiologyBackupNative(backup, passphrase)
  }

  async function importEncryptedBackup(raw: string, passphrase: string, options?: { force?: boolean }) {
    const envelope = parseEncryptedBiologyBackup(raw)
    const backup = await decryptBiologyBackup(envelope, passphrase)
    const validation = validateImportCandidate(backup, profile.value)
    if (!validation.valid && !options?.force) {
      throw new Error(validation.issues.map((issue) => issue.message).join(' '))
    }
    await persist(validation.incoming)
    return validation
  }

  async function importEncryptedBackupFromFile(passphrase: string, options?: { force?: boolean }) {
    const backup = await loadEncryptedBiologyBackupNative(passphrase)
    if (!backup) return false
    const validation = validateImportCandidate(backup, profile.value)
    if (!validation.valid && !options?.force) {
      throw new Error(validation.issues.map((issue) => issue.message).join(' '))
    }
    await persist(validation.incoming)
    return validation
  }

  function trend(name: string) { return calculateBiomarkerTrend(profile.value.biomarkers, name) }
  function biomarkerNames() { return getBiomarkerNames(profile.value.biomarkers) }
  function interactionFlags() { return screenInteractions(profile.value.medications, profile.value.supplements) }

  async function reset() {
    await clearBiologyProfile()
    profile.value = emptyBiologyProfile()
  }

  return {
    profile,
    initialized,
    initializing,
    initialize,
    persist,
    addBiomarker,
    exportBackup,
    exportBackupToFile,
    importBackup,
    previewImport,
    importBackupFromFile,
    exportEncryptedBackup,
    exportEncryptedBackupToFile,
    importEncryptedBackup,
    importEncryptedBackupFromFile,
    trend,
    biomarkerNames,
    interactionFlags,
    reset,
  }
}
