import { describe, expect, it } from 'vitest'
import type { MemoryRecord } from '../../../app/services/agent-superstack/types'
import { AGENT_MEMORY_STORAGE_KEY } from '../../../app/services/agent-memory-persistence'
import { searchAgentMemories } from './agent-memory-index'

function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() { return store.size },
    clear() { store.clear() },
    getItem(key: string) { return store.get(key) ?? null },
    key(index: number) { return [...store.keys()][index] ?? null },
    removeItem(key: string) { store.delete(key) },
    setItem(key: string, value: string) { store.set(key, value) },
  }
}

describe('agent memory RAG index', () => {
  it('indexes persisted agent memories for search', () => {
    const storage = memoryStorage()
    const records: MemoryRecord[] = [{
      id: 'mem_1',
      text: 'Magnesium glycinate before sleep helps recovery',
      type: 'preference',
      tags: ['sleep', 'supplements'],
      importance: 0.7,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
    }]
    storage.setItem(AGENT_MEMORY_STORAGE_KEY, JSON.stringify(records))

    const hits = searchAgentMemories('magnesium sleep', 5, storage)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.source).toBe('agent-memory:preference')
  })
})
