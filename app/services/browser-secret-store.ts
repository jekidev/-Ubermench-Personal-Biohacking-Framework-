const STORAGE_KEY = 'ubermensch:browser-secrets:v1'
const PERSIST_KEY = 'ubermensch:browser-secrets:persist'
type BrowserSecretStore = Record<string, string>
let memory: BrowserSecretStore = Object.create(null)

function parse(raw: string | null): BrowserSecretStore {
  const result: BrowserSecretStore = Object.create(null)
  if (!raw) return result
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid browser credential storage.')
  for (const [key, secret] of Object.entries(value)) {
    if (typeof secret === 'string') result[key] = secret
  }
  return result
}

export function browserSecretsPersist(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(PERSIST_KEY) === 'true'
}

function readStore(): BrowserSecretStore {
  if (browserSecretsPersist()) return parse(localStorage.getItem(STORAGE_KEY))
  const session = typeof sessionStorage === 'undefined' ? memory : parse(sessionStorage.getItem(STORAGE_KEY))
  // Preserve existing keys while moving the old default to session-only storage.
  const legacy = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
  if (legacy) {
    const migrated = Object.assign(Object.create(null), parse(legacy), session) as BrowserSecretStore
    writeStore(migrated)
    localStorage.removeItem(STORAGE_KEY)
    return migrated
  }
  return session
}

function writeStore(store: BrowserSecretStore): void {
  const raw = JSON.stringify(store)
  if (browserSecretsPersist()) localStorage.setItem(STORAGE_KEY, raw)
  else if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY, raw)
  else memory = store
}

export function setBrowserSecretPersistence(enabled: boolean): void {
  const current = readStore()
  if (typeof localStorage === 'undefined') {
    if (enabled) throw new Error('Persistent browser storage is unavailable.')
    return
  }
  // Write the destination before removing the previous copy.
  if (enabled) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    localStorage.setItem(PERSIST_KEY, 'true')
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY)
  } else {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    else memory = current
    localStorage.removeItem(PERSIST_KEY)
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function getBrowserSecret(key: string): string | undefined { return readStore()[key] }
export function setBrowserSecret(key: string, value: string): void {
  const store = readStore()
  store[key] = value
  writeStore(store)
}
export function removeBrowserSecret(key: string): void {
  const store = readStore()
  delete store[key]
  writeStore(store)
}
export function clearBrowserSecrets(): void {
  memory = Object.create(null)
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY)
}
