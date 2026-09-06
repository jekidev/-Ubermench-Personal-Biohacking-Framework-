import type { DocumentChunk } from './chunker'
import { SemanticMemoryIndex, type SemanticMemoryItem } from '../../../app/services/semantic-memory'

export type DocumentRagStore = {
  schemaVersion: 1
  chunks: DocumentChunk[]
}

const STORAGE_KEY = 'ubermench:document-rag:v1'

export function emptyDocumentRagStore(): DocumentRagStore {
  return { schemaVersion: 1, chunks: [] }
}

export function loadDocumentRagStore(storage: Pick<Storage, 'getItem'> = localStorage): DocumentRagStore {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyDocumentRagStore()
    const parsed = JSON.parse(raw) as DocumentRagStore
    return parsed.schemaVersion === 1 ? parsed : emptyDocumentRagStore()
  } catch {
    return emptyDocumentRagStore()
  }
}

export function saveDocumentRagStore(store: DocumentRagStore, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function appendDocumentChunks(store: DocumentRagStore, chunks: DocumentChunk[]): DocumentRagStore {
  const seen = new Set(store.chunks.map((chunk) => chunk.id))
  const fresh = chunks.filter((chunk) => !seen.has(chunk.id))
  return fresh.length ? { ...store, chunks: [...store.chunks, ...fresh] } : store
}

function chunkToMemoryItem(chunk: DocumentChunk): SemanticMemoryItem {
  return {
    id: chunk.id,
    title: `${chunk.filename}${chunk.page ? ` (page ${chunk.page})` : ''}`,
    content: chunk.content,
    source: `document:${chunk.documentId}`,
    tags: [...chunk.tags, chunk.extractionMethod, chunk.sha256.slice(0, 12)],
    createdAt: chunk.indexedAt,
    updatedAt: chunk.indexedAt,
    confidence: chunk.extractionMethod === 'native-text' ? 0.9 : 0.7,
  }
}

export class DocumentRagIndex {
  private readonly memory = new SemanticMemoryIndex()
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>

  constructor(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
    this.storage = storage
    for (const chunk of loadDocumentRagStore(storage).chunks) {
      this.memory.upsert(chunkToMemoryItem(chunk))
    }
  }

  indexChunks(chunks: DocumentChunk[]): DocumentRagStore {
    let store = loadDocumentRagStore(this.storage)
    store = appendDocumentChunks(store, chunks)
    saveDocumentRagStore(store, this.storage)
    for (const chunk of chunks) {
      this.memory.upsert(chunkToMemoryItem(chunk))
    }
    return store
  }

  search(query: string, limit = 8) {
    return this.memory.search(query, undefined, limit)
  }

  allChunks() {
    return loadDocumentRagStore(this.storage).chunks
  }
}

export function searchDocuments(query: string, limit = 8) {
  return new DocumentRagIndex().search(query, limit)
}
