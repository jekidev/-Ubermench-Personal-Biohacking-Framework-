import { downloadDriveFile, listDrivePdfFiles } from './adapters/google-drive-adapter'
import { extractPdfTextBlocks } from '../longevity/pdf/text-extractor'
import { indexUploadedDocument } from '../longevity/rag/index-document'
import { recordConnectorSync } from './sync-meta'

export type DriveRagSyncStore = {
  schemaVersion: 1
  syncedFileIds: string[]
  lastSyncedAt?: string
  lastError?: string
}

const STORAGE_KEY = 'ubermensch:drive-rag-sync:v1'

export function emptyDriveRagSyncStore(): DriveRagSyncStore {
  return { schemaVersion: 1, syncedFileIds: [] }
}

export function loadDriveRagSyncStore(storage: Pick<Storage, 'getItem'> = localStorage): DriveRagSyncStore {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyDriveRagSyncStore()
    const parsed = JSON.parse(raw) as DriveRagSyncStore
    return parsed.schemaVersion === 1 ? parsed : emptyDriveRagSyncStore()
  } catch {
    return emptyDriveRagSyncStore()
  }
}

export function saveDriveRagSyncStore(store: DriveRagSyncStore, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice())
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export type DriveRagSyncResult = {
  indexed: number
  skipped: number
  files: Array<{ id: string; name: string; chunks: number }>
  store: DriveRagSyncStore
}

export async function syncDrivePdfsToRag(options?: {
  folderId?: string
  limit?: number
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}): Promise<DriveRagSyncResult> {
  const storage = options?.storage ?? localStorage
  let store = loadDriveRagSyncStore(storage)
  const synced = new Set(store.syncedFileIds)
  const listed = await listDrivePdfFiles({ folderId: options?.folderId, pageSize: options?.limit ?? 25 })
  const files: DriveRagSyncResult['files'] = []
  let indexed = 0
  let skipped = 0

  for (const file of listed.files) {
    if (synced.has(file.id)) {
      skipped += 1
      continue
    }
    const bytes = await downloadDriveFile(file.id)
    const sha256 = await sha256Hex(bytes)
    const pageTexts = extractPdfTextBlocks(bytes).map((block) => ({
      page: block.page,
      text: block.text,
      confidence: block.confidence,
    }))
    const result = indexUploadedDocument({
      documentId: `drive:${file.id}`,
      sha256,
      filename: file.name,
      bytes,
      pageTexts,
      extractionMethod: 'native-text',
    })
    if (result.chunks.length) {
      indexed += 1
      synced.add(file.id)
      files.push({ id: file.id, name: file.name, chunks: result.chunks.length })
    } else {
      skipped += 1
    }
  }

  store = {
    ...store,
    syncedFileIds: [...synced],
    lastSyncedAt: new Date().toISOString(),
    lastError: undefined,
  }
  saveDriveRagSyncStore(store, storage)
  recordConnectorSync('google-drive', store.lastSyncedAt, storage)
  return { indexed, skipped, files, store }
}
