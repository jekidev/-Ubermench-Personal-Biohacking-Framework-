import { isTauri } from '@tauri-apps/api/core'
import type { BiologyBackup } from './biology-backup'
import { parseBiologyBackup, serializeBiologyBackup } from './biology-backup'

const BACKUP_FILTERS = [{ name: 'Ubermench biology backup', extensions: ['json'] }]

export function assertTauriRuntime() {
  if (!isTauri()) {
    throw new Error('Native biology backup dialogs require the Tauri desktop application')
  }
}

export async function saveBiologyBackupNative(backup: BiologyBackup): Promise<string | null> {
  assertTauriRuntime()
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')

  const path = await save({
    title: 'Export Ubermench biology backup',
    defaultPath: 'ubermench-biology-backup.json',
    filters: BACKUP_FILTERS,
  })
  if (!path) return null

  await writeTextFile(path, serializeBiologyBackup(backup))
  return path
}

export async function loadBiologyBackupNative(): Promise<BiologyBackup | null> {
  assertTauriRuntime()
  const { open } = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')

  const selected = await open({
    title: 'Import Ubermench biology backup',
    multiple: false,
    directory: false,
    filters: BACKUP_FILTERS,
  })
  if (!selected || Array.isArray(selected)) return null

  return parseBiologyBackup(await readTextFile(selected))
}
