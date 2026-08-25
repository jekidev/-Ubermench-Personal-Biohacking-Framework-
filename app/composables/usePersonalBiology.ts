import type { BiomarkerRecord, PersonalBiologyProfile } from '~/types/biology'
import { emptyBiologyProfile, loadBiologyProfile, saveBiologyProfile, clearBiologyProfile } from '~/services/biology-store'
import { calculateBiomarkerTrend, getBiomarkerNames } from '~/services/biomarker-engine'
import { screenInteractions } from '~/services/interaction-engine'
import { createBiologyBackup, parseBiologyBackup, serializeBiologyBackup } from '~/services/biology-backup'
import { loadBiologyBackupNative, saveBiologyBackupNative } from '~/services/biology-backup-native'

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

  function exportBackup() {
    return serializeBiologyBackup(createBiologyBackup(profile.value))
  }

  async function exportBackupToFile() {
    return saveBiologyBackupNative(createBiologyBackup(profile.value))
  }

  async function importBackup(raw: string) {
    const backup = parseBiologyBackup(raw)
    await persist(backup.profile)
  }

  async function importBackupFromFile() {
    const backup = await loadBiologyBackupNative()
    if (!backup) return false
    await persist(backup.profile)
    return true
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
    importBackupFromFile,
    trend,
    biomarkerNames,
    interactionFlags,
    reset,
  }
}
