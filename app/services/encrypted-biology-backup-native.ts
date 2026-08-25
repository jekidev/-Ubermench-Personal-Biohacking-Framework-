import { isTauri } from '@tauri-apps/api/core'
import type { BiologyBackup } from './biology-backup'
import {
  decryptBiologyBackup,
  encryptBiologyBackup,
  parseEncryptedBiologyBackup,
  serializeEncryptedBiologyBackup,
} from './encrypted-biology-backup'

const BACKUP_FILTERS = [{ name: 'Encrypted Ubermench biology backup', extensions: ['json'] }]

export function assertTauriRuntime() {
  if (!isTauri()) {
    throw new Error('Native encrypted biology backup dialogs require the Tauri desktop application')
  }
}

export async function saveEncryptedBiologyBackupNative(
  backup: BiologyBackup,
  passphrase: string,
): Promise<string | null> {
  assertTauriRuntime()
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')

  const path = await save({
    title: 'Export encrypted Ubermench biology backup',
    defaultPath: 'ubermench-encrypted-biology-backup.json',
    filters: BACKUP_FILTERS,
  })
  if (!path) return null

  const encrypted = await encryptBiologyBackup(backup, passphrase)
  await writeTextFile(path, serializeEncryptedBiologyBackup(encrypted))
  return path
}

export async function loadEncryptedBiologyBackupNative(
  passphrase: string,
): Promise<BiologyBackup | null> {
  assertTauriRuntime()
  const { open } = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')

  const selected = await open({
    title: 'Import encrypted Ubermench biology backup',
    multiple: false,
    directory: false,
    filters: BACKUP_FILTERS,
  })
  if (!selected || Array.isArray(selected)) return null

  const envelope = parseEncryptedBiologyBackup(await readTextFile(selected))
  return decryptBiologyBackup(envelope, passphrase)
}
