import { describe, expect, it } from 'vitest'
import type { MemoryRecord } from '../../../app/services/agent-superstack/types'
import { AGENT_MEMORY_STORAGE_KEY } from '../../../app/services/agent-memory-persistence'
import { searchUnifiedRag } from './unified-search'
import { emptyDocumentRagStore, saveDocumentRagStore } from './document-index'
import type { DocumentChunk } from './chunker'

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

describe('unified RAG search', () => {
  it('merges document and agent memory hits', () => {
    const storage = memoryStorage()
    const chunk: DocumentChunk = {
      id: 'chunk-1',
      documentId: 'doc-1',
      filename: 'labs.pdf',
      content: 'CRP inflammation marker elevated',
      page: 1,
      tags: ['lab'],
      extractionMethod: 'native-text',
      sha256: 'abc123',
      indexedAt: '2026-01-01T00:00:00.000Z',
    }
    saveDocumentRagStore({ ...emptyDocumentRagStore(), chunks: [chunk] }, storage)

    const records: MemoryRecord[] = [{
      id: 'mem_1',
      text: 'User prefers omega-3 for cardiovascular support',
      type: 'preference',
      tags: ['supplements'],
      importance: 0.8,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
    }]
    storage.setItem(AGENT_MEMORY_STORAGE_KEY, JSON.stringify(records))

    const hits = searchUnifiedRag('omega cardiovascular', { limit: 6, storage })
    expect(hits.length).toBeGreaterThanOrEqual(1)
    expect(hits.some((hit) => hit.kind === 'agent-memory')).toBe(true)
  })
})
