export type SecretStore = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Desktop implementations must delegate to Tauri Stronghold/OS-backed storage.
 * Web implementations are intentionally unsupported for persistent API secrets.
 */
export function assertDesktopSecretStore(runtime: 'web' | 'tauri'): void {
  if (runtime !== 'tauri') throw new Error('Persistent API-key storage is only supported through the native Tauri secret store.')
}
