import { describe, expect, it, beforeEach } from 'vitest'
import { listConnectorStatuses } from './connector-runtime'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('connector runtime', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
  })

  it('returns status snapshots for all connectors', async () => {
    const statuses = await listConnectorStatuses()
    expect(statuses.length).toBeGreaterThan(10)
    expect(statuses.find((item) => item.id === 'gmail')?.implementationStatus).toBe('scaffold')
  })
})
