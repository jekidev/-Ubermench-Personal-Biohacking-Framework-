const STORAGE_KEY = 'ubermensch:browser-secrets:v1'

type BrowserSecretStore = Record<string, string>

function readStore(): BrowserSecretStore {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as BrowserSecretStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: BrowserSecretStore): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getBrowserSecret(key: string): string | undefined {
  return readStore()[key]
}

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
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
