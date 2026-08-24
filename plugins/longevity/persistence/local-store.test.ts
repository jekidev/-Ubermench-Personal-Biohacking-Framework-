import { describe, expect, it } from 'vitest'
import {
  appendDocument,
  appendObservations,
  appendVariants,
  emptyLongevityStore,
  loadLongevityStore,
  saveLongevityStore,
} from './local-store'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() { return data.size },
  }
}

describe('longevity local store', () => {
  it('round-trips data locally', () => {
    const storage = memoryStorage()
    let store = emptyLongevityStore()
    store = appendDocument(store, {
      id: 'doc-1', sha256: 'abc', filename: 'labs.pdf', mimeType: 'application/pdf',
      sizeBytes: 10, createdAt: '2026-08-24T00:00:00Z', localOnly: true,
    })
    saveLongevityStore(storage, store)
    expect(loadLongevityStore(storage)).toEqual(store)
  })

  it('deduplicates source documents by sha256', () => {
    let store = emptyLongevityStore()
    const document = {
      id: 'doc-1', sha256: 'same', filename: 'a.pdf', mimeType: 'application/pdf',
      sizeBytes: 1, createdAt: '2026-08-24T00:00:00Z', localOnly: true as const,
    }
    store = appendDocument(store, document)
    store = appendDocument(store, { ...document, id: 'doc-2' })
    expect(store.documents).toHaveLength(1)
  })

  it('keeps confirmed observations and variants append-only', () => {
    let store = emptyLongevityStore()
    const observation = {
      id: 'obs-1', sourceDocumentId: 'doc-1', biomarker: 'ApoB', value: 0.82,
      unit: 'g/L', collectedAt: '2026-08-20', confidence: 1,
    }
    const variant = {
      id: 'var-1', sourceDocumentId: 'dna-1', rsid: 'rs4680', genotype: 'AG', importedAt: '2026-08-24',
    }
    store = appendObservations(store, [observation, observation])
    store = appendVariants(store, [variant, variant])
    expect(store.observations).toHaveLength(1)
    expect(store.variants).toHaveLength(1)
  })
})
