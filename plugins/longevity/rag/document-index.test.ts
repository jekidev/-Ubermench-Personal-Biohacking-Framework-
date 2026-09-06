import { describe, expect, it, beforeEach } from 'vitest'
import { DocumentRagIndex, loadDocumentRagStore, saveDocumentRagStore, emptyDocumentRagStore } from './document-index'
import { chunkDocumentPages } from './chunker'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: (key) => { map.delete(key) },
    clear: () => { map.clear() },
    key: (index) => [...map.keys()][index] ?? null,
    get length() { return map.size },
  }
}

describe('document rag index', () => {
  let storage: Storage

  beforeEach(() => {
    storage = memoryStorage()
    saveDocumentRagStore(emptyDocumentRagStore(), storage)
  })

  it('indexes and searches lab document chunks', () => {
    const chunks = chunkDocumentPages({
      documentId: 'doc-1',
      sha256: 'sha',
      filename: 'labs.pdf',
      pages: [{ page: 1, text: 'CRP 1.2 mg/L reference 0-5\nGlucose 5.1 mmol/L' }],
    })
    new DocumentRagIndex(storage).indexChunks(chunks)
    const results = new DocumentRagIndex(storage).search('CRP result', 5)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.content).toMatch(/CRP/i)
    expect(loadDocumentRagStore(storage).chunks).toHaveLength(chunks.length)
  })
})
