import type { BiomarkerRecord, PersonalBiologyProfile } from '~/types/biology'
import { emptyBiologyProfile, loadBiologyProfile, saveBiologyProfile, clearBiologyProfile } from '~/services/biology-store'
import { calculateBiomarkerTrend, getBiomarkerNames } from '~/services/biomarker-engine'
import { screenInteractions } from '~/services/interaction-engine'

export function usePersonalBiology() {
  const profile = useState<PersonalBiologyProfile>('personal-biology-profile', () => emptyBiologyProfile())
  const initialized = useState<boolean>('personal-biology-initialized', () => false)

  function initialize() {
    if (initialized.value) return
    profile.value = loadBiologyProfile()
    initialized.value = true
  }

  function persist(next: PersonalBiologyProfile) {
    profile.value = { ...next, updatedAt: new Date().toISOString() }
    saveBiologyProfile(profile.value)
  }

  function addBiomarker(record: BiomarkerRecord) {
    persist({ ...profile.value, biomarkers: [...profile.value.biomarkers, record] })
  }

  function trend(name: string) { return calculateBiomarkerTrend(profile.value.biomarkers, name) }
  function biomarkerNames() { return getBiomarkerNames(profile.value.biomarkers) }
  function interactionFlags() { return screenInteractions(profile.value.medications, profile.value.supplements) }
  function reset() { clearBiologyProfile(); profile.value = emptyBiologyProfile() }

  return { profile, initialized, initialize, persist, addBiomarker, trend, biomarkerNames, interactionFlags, reset }
}
