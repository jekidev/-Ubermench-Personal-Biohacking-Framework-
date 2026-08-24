import { BaseDirectory, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { PersonalBiologyProfile } from '~/types/biology'

const STORAGE_KEY = 'ubermench.personal-biology.v1'
const TAURI_STORAGE_FILE = 'personal-biology.v1.json'

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
    const raw = isTauriRuntime()
      ? await readTextFile(TAURI_STORAGE_FILE, { baseDir: BaseDirectory.AppData })
      : window.localStorage.getItem(STORAGE_KEY)

    if (!raw) return emptyBiologyProfile()
    const parsed = JSON.parse(raw) as PersonalBiologyProfile
    if (parsed.version !== 1) return emptyBiologyProfile()
    return parsed
  } catch {
    return emptyBiologyProfile()
  }
}

export async function saveBiologyProfile(profile: PersonalBiologyProfile): Promise<void> {
  if (typeof window === 'undefined') return

  const value = JSON.stringify({ ...profile, updatedAt: new Date().toISOString() })

  if (isTauriRuntime()) {
    await writeTextFile(TAURI_STORAGE_FILE, value, { baseDir: BaseDirectory.AppData })
    return
  }

  window.localStorage.setItem(STORAGE_KEY, value)
}

export async function clearBiologyProfile(): Promise<void> {
  if (typeof window === 'undefined') return

  if (isTauriRuntime()) {
    try {
      const { remove } = await import('@tauri-apps/plugin-fs')
      await remove(TAURI_STORAGE_FILE, { baseDir: BaseDirectory.AppData })
    } catch {
      // Missing local profile is already the desired state.
    }
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}
