import { describe, expect, it } from 'vitest'
import { getBrowserSecret, setBrowserSecret, clearBrowserSecrets } from './browser-secret-store'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('browser secret store', () => {
  it('persists secrets in localStorage', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
    setBrowserSecret('GOOGLE_ACCESS_TOKEN', 'token-123')
    expect(getBrowserSecret('GOOGLE_ACCESS_TOKEN')).toBe('token-123')
    clearBrowserSecrets()
    expect(getBrowserSecret('GOOGLE_ACCESS_TOKEN')).toBeUndefined()
  })
})
