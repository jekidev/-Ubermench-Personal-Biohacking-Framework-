import { describe, expect, it } from 'vitest'
import { emptyDriveRagSyncStore, loadDriveRagSyncStore, saveDriveRagSyncStore } from './drive-rag-sync'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('drive rag sync store', () => {
  it('persists synced file ids', () => {
    const storage = new MemoryStorage()
    const store = { ...emptyDriveRagSyncStore(), syncedFileIds: ['file-1'], lastSyncedAt: '2026-01-01T00:00:00.000Z' }
    saveDriveRagSyncStore(store, storage)
    expect(loadDriveRagSyncStore(storage).syncedFileIds).toEqual(['file-1'])
  })
})
