import type { GeneticImportPreview, StoredImportDocument } from './types'
import type { BloodImportPreview } from './types'

const DB_NAME = 'ubermench-longevity'
const DB_VERSION = 1
const DOCUMENTS_STORE = 'documents'
const BLOOD_STORE = 'blood-imports'
const DNA_STORE = 'dna-imports'

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function openLongevityDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(BLOOD_STORE)) db.createObjectStore(BLOOD_STORE, { keyPath: 'sourceDocumentId' })
      if (!db.objectStoreNames.contains(DNA_STORE)) db.createObjectStore(DNA_STORE, { keyPath: 'sourceDocumentId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveImportDocument(document: StoredImportDocument): Promise<void> {
  const db = await openLongevityDb()
  await requestToPromise(db.transaction(DOCUMENTS_STORE, 'readwrite').objectStore(DOCUMENTS_STORE).put(document))
  db.close()
}

export async function saveBloodImport(preview: BloodImportPreview): Promise<void> {
  const db = await openLongevityDb()
  await requestToPromise(db.transaction(BLOOD_STORE, 'readwrite').objectStore(BLOOD_STORE).put(preview))
  db.close()
}

export async function saveGeneticImport(preview: GeneticImportPreview): Promise<void> {
  const db = await openLongevityDb()
  await requestToPromise(db.transaction(DNA_STORE, 'readwrite').objectStore(DNA_STORE).put(preview))
  db.close()
}

export async function listImportDocuments(): Promise<StoredImportDocument[]> {
  const db = await openLongevityDb()
  const result = await requestToPromise(db.transaction(DOCUMENTS_STORE, 'readonly').objectStore(DOCUMENTS_STORE).getAll())
  db.close()
  return result
}
