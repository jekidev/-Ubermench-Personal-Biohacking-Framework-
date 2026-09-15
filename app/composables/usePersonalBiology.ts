import type { BiomarkerRecord, DietProtocol, MedicationRecord, PersonalBiologyProfile, SupplementRecord } from '~/types/biology'
import { applyDietProtocol, applyGoals, applyMedication, applySupplement, removeRecord } from '~/services/regimen-editor'
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
  const loadError = useState<string>('personal-biology-load-error', () => '')

  async function initialize() {
    if (initialized.value || initializing.value) return
    initializing.value = true
    try {
      profile.value = await loadBiologyProfile()
      initialized.value = true
      loadError.value = ''
    } catch (cause) {
      loadError.value = cause instanceof Error ? cause.message : 'Unable to load saved biology data.'
    } finally {
      initializing.value = false
    }
  }

  function requireLoaded() {
    if (!initialized.value || loadError.value) throw new Error(loadError.value || 'Load the biology profile before editing or exporting it.')
  }

  async function persist(next: PersonalBiologyProfile, recovery = false) {
    if (!recovery) requireLoaded()
    const saved = JSON.parse(JSON.stringify({ ...next, updatedAt: new Date().toISOString() })) as PersonalBiologyProfile
    await saveBiologyProfile(saved)
    profile.value = saved
    initialized.value = true
    loadError.value = ''
  }

  async function addBiomarker(record: BiomarkerRecord) {
    await persist({ ...profile.value, biomarkers: [...profile.value.biomarkers, record] })
  }

  async function saveSupplement(record: SupplementRecord) {
    await persist(applySupplement(profile.value, record))
  }

  async function removeSupplement(id: string) {
    await persist({ ...profile.value, supplements: removeRecord(profile.value.supplements, id) })
  }

  async function saveMedication(record: MedicationRecord) {
    await persist(applyMedication(profile.value, record))
  }

  async function removeMedication(id: string) {
    await persist({ ...profile.value, medications: removeRecord(profile.value.medications, id) })
  }

  async function saveDiet(diet: DietProtocol | undefined) {
    await persist(applyDietProtocol(profile.value, diet))
  }

  async function saveGoals(goals: string[]) {
    await persist(applyGoals(profile.value, goals))
  }

  function rememberBackup(exportedAt: string, checksum?: string, biomarkerCount?: number) {
    recordBackupExport({
      lastExportedAt: exportedAt,
      lastChecksumPrefix: checksum?.slice(0, 12),
      biomarkerCount,
    })
  }

  async function exportBackup() {
    requireLoaded()
    const backup = await createBiologyBackup(profile.value)
    return serializeBiologyBackup(backup)
  }

  async function exportBackupToFile() {
    requireLoaded()
    const backup = await createBiologyBackup(profile.value)
    const path = await saveBiologyBackupNative(backup)
    if (path) rememberBackup(backup.exportedAt, backup.checksum, backup.metadata?.biomarkerCount)
    return path
  }

  async function importBackup(raw: string, options?: { force?: boolean }) {
    const backup = await parseBiologyBackup(raw)
    const validation = validateImportCandidate(backup, profile.value)
    if (!validation.valid && !options?.force) {
      throw new Error(validation.issues.map((issue) => issue.message).join(' '))
    }
    await persist(validation.incoming, true)
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
    await persist(validation.incoming, true)
    return validation
  }

  async function exportEncryptedBackup(passphrase: string) {
    requireLoaded()
    const backup = await createBiologyBackup(profile.value)
    return serializeEncryptedBiologyBackup(await encryptBiologyBackup(backup, passphrase))
  }

  async function exportEncryptedBackupToFile(passphrase: string) {
    requireLoaded()
    const backup = await createBiologyBackup(profile.value)
    const path = await saveEncryptedBiologyBackupNative(backup, passphrase)
    if (path) rememberBackup(backup.exportedAt, backup.checksum, backup.metadata?.biomarkerCount)
    return path
  }

  async function importEncryptedBackup(raw: string, passphrase: string, options?: { force?: boolean }) {
    const envelope = parseEncryptedBiologyBackup(raw)
    const backup = await decryptBiologyBackup(envelope, passphrase)
    const validation = validateImportCandidate(backup, profile.value)
    if (!validation.valid && !options?.force) {
      throw new Error(validation.issues.map((issue) => issue.message).join(' '))
    }
    await persist(validation.incoming, true)
    return validation
  }

  async function importEncryptedBackupFromFile(passphrase: string, options?: { force?: boolean }) {
    const backup = await loadEncryptedBiologyBackupNative(passphrase)
    if (!backup) return false
    const validation = validateImportCandidate(backup, profile.value)
    if (!validation.valid && !options?.force) {
      throw new Error(validation.issues.map((issue) => issue.message).join(' '))
    }
    await persist(validation.incoming, true)
    return validation
  }

  function trend(name: string) { return calculateBiomarkerTrend(profile.value.biomarkers, name) }
  function biomarkerNames() { return getBiomarkerNames(profile.value.biomarkers) }
  function interactionFlags() { return screenInteractions(profile.value.medications, profile.value.supplements) }

  async function reset() {
    await clearBiologyProfile()
    profile.value = emptyBiologyProfile()
    initialized.value = true
    loadError.value = ''
  }

  return {
    profile,
    initialized,
    initializing,
    loadError,
    initialize,
    persist,
    addBiomarker,
    saveSupplement,
    removeSupplement,
    saveMedication,
    removeMedication,
    saveDiet,
    saveGoals,
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
