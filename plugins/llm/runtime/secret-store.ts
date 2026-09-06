import { getSecret, removeSecret, setSecret } from '~/services/secret-vault'

export type SecretStore = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Desktop implementations delegate to Tauri Stronghold/OS-backed storage.
 * Web implementations are intentionally unsupported for persistent API secrets.
 */
export function assertDesktopSecretStore(runtime: 'web' | 'tauri'): void {
  if (runtime !== 'tauri') throw new Error('Persistent API-key storage is only supported through the native Tauri secret store.')
}

export function createSecretStore(): SecretStore {
  return {
    async get(key) {
      const value = await getSecret(key)
      return value ?? null
    },
    async set(key, value) {
      await setSecret(key, value)
    },
    async delete(key) {
      await removeSecret(key)
    },
  }
}
