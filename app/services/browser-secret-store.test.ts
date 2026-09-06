import { beforeEach, describe, expect, it } from 'vitest'
import { clearBrowserSecrets, getBrowserSecret, removeBrowserSecret, setBrowserSecret } from './browser-secret-store'

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
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
  })

  it('persists and removes secrets', () => {
    setBrowserSecret('GOOGLE_CLIENT_ID', 'abc')
    expect(getBrowserSecret('GOOGLE_CLIENT_ID')).toBe('abc')
    removeBrowserSecret('GOOGLE_CLIENT_ID')
    expect(getBrowserSecret('GOOGLE_CLIENT_ID')).toBeUndefined()
    setBrowserSecret('X', '1')
    clearBrowserSecrets()
    expect(getBrowserSecret('X')).toBeUndefined()
  })
})
