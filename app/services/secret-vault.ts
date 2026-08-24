const VAULT_PATH = 'ubermench-secrets.hold'
const CLIENT_NAME = 'llm-provider-secrets'

let stronghold: Awaited<ReturnType<typeof import('@tauri-apps/plugin-stronghold').Stronghold.load>> | null = null
let client: Awaited<ReturnType<NonNullable<typeof stronghold>['loadClient']>> | null = null
const browserSecrets = new Map<string, string>()

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function getStrongholdModule() {
  return import('@tauri-apps/plugin-stronghold')
}

export async function unlockSecretVault(masterPassword: string): Promise<void> {
  if (!masterPassword.trim()) throw new Error('A non-empty vault password is required.')
  if (!isTauriRuntime()) return

  const { Stronghold } = await getStrongholdModule()
  const instance = await Stronghold.load(VAULT_PATH, masterPassword)
  let nextClient
  try {
    nextClient = await instance.loadClient(CLIENT_NAME)
  } catch {
    nextClient = await instance.createClient(CLIENT_NAME)
    await instance.save()
  }
  stronghold = instance
  client = nextClient
}

export function isSecretVaultUnlocked(): boolean {
  return isTauriRuntime() ? Boolean(stronghold && client) : true
}

export async function setSecret(key: string, value: string): Promise<void> {
  if (!key.trim()) throw new Error('Secret key is required.')
  if (isTauriRuntime()) {
    if (!client || !stronghold) throw new Error('Secret vault is locked.')
    await client.getStore().insert(key, Array.from(new TextEncoder().encode(value)))
    await stronghold.save()
    return
  }
  browserSecrets.set(key, value)
}

export async function getSecret(key: string): Promise<string | undefined> {
  if (isTauriRuntime()) {
    if (!client) throw new Error('Secret vault is locked.')
    const value = await client.getStore().get(key)
    return value ? new TextDecoder().decode(value) : undefined
  }
  return browserSecrets.get(key)
}

export async function removeSecret(key: string): Promise<void> {
  if (isTauriRuntime()) {
    if (!client || !stronghold) throw new Error('Secret vault is locked.')
    await client.getStore().remove(key)
    await stronghold.save()
    return
  }
  browserSecrets.delete(key)
}

export async function lockSecretVault(): Promise<void> {
  if (isTauriRuntime() && stronghold) {
    await stronghold.unload()
  }
  stronghold = null
  client = null
  browserSecrets.clear()
}
