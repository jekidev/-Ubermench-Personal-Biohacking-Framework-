import type { PersonalBiologyProfile } from '~/types/biology'

const STORAGE_KEY = 'ubermench.personal-biology.v1'

export const emptyBiologyProfile = (): PersonalBiologyProfile => ({ version: 1, biomarkers: [], variants: [], medications: [], supplements: [], symptoms: [], sleep: [], training: [], goals: [], updatedAt: new Date().toISOString() })

export function loadBiologyProfile(): PersonalBiologyProfile {
  if (typeof window === 'undefined') return emptyBiologyProfile()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyBiologyProfile()
    const parsed = JSON.parse(raw) as PersonalBiologyProfile
    if (parsed.version !== 1) return emptyBiologyProfile()
    return parsed
  } catch { return emptyBiologyProfile() }
}

export function saveBiologyProfile(profile: PersonalBiologyProfile): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }))
}

export function clearBiologyProfile(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
}
