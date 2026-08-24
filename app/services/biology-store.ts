import type { PersonalBiologyProfile } from '~/types/biology'
import { clearSqliteBiologyProfile, loadSqliteBiologyProfile, saveSqliteBiologyProfile } from './sqlite-store'

const STORAGE_KEY = 'ubermench.personal-biology.v1'

export const emptyBiologyProfile = (): PersonalBiologyProfile => ({
  version: 1,
  biomarkers: [],
  variants: [],
  medications: [],
  supplements: [],
  symptoms: [],
  sleep: [],
  training: [],
  goals: [],
  updatedAt: new Date().toISOString(),
})

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function loadBiologyProfile(): Promise<PersonalBiologyProfile> {
  if (typeof window === 'undefined') return emptyBiologyProfile()

  try {
    if (isTauriRuntime()) {
      return (await loadSqliteBiologyProfile()) ?? emptyBiologyProfile()
    }

    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyBiologyProfile()
    const parsed = JSON.parse(raw) as PersonalBiologyProfile
    return parsed.version === 1 ? parsed : emptyBiologyProfile()
  } catch {
    return emptyBiologyProfile()
  }
}

export async function saveBiologyProfile(profile: PersonalBiologyProfile): Promise<void> {
  if (typeof window === 'undefined') return

  const next = { ...profile, updatedAt: new Date().toISOString() }
  if (isTauriRuntime()) {
    await saveSqliteBiologyProfile(next)
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export async function clearBiologyProfile(): Promise<void> {
  if (typeof window === 'undefined') return

  if (isTauriRuntime()) {
    await clearSqliteBiologyProfile()
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}
