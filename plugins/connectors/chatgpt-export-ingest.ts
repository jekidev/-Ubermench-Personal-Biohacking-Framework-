import {
  conversationToPlainText,
  parseChatGptExportJson,
  type ChatGptConversation,
} from './chatgpt-export-parser'
import { indexTranscriptDocument } from '../longevity/rag/index-transcript'

export type ChatGptExportIngestStore = {
  schemaVersion: 1
  syncedConversationIds: string[]
  lastSyncedAt?: string
  lastError?: string
}

const STORAGE_KEY = 'ubermensch:chatgpt-export-ingest:v1'

export function emptyChatGptExportIngestStore(): ChatGptExportIngestStore {
  return { schemaVersion: 1, syncedConversationIds: [] }
}

export function loadChatGptExportIngestStore(
  storage: Pick<Storage, 'getItem'> = localStorage,
): ChatGptExportIngestStore {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyChatGptExportIngestStore()
    const parsed = JSON.parse(raw) as ChatGptExportIngestStore
    return parsed.schemaVersion === 1 ? parsed : emptyChatGptExportIngestStore()
  } catch {
    return emptyChatGptExportIngestStore()
  }
}

export function saveChatGptExportIngestStore(
  store: ChatGptExportIngestStore,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function conversationDocumentId(conversation: ChatGptConversation): string {
  return `chatgpt:${conversation.id}`
}

export type ChatGptExportIngestResult = {
  indexed: number
  skipped: number
  failed: number
  conversations: Array<{ id: string; title: string; chunks: number; messages: number }>
  errors: Array<{ id: string; message: string }>
  store: ChatGptExportIngestStore
}

export async function ingestChatGptExportJson(options: {
  raw: unknown
  force?: boolean
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}): Promise<ChatGptExportIngestResult> {
  const storage = options.storage ?? localStorage
  let store = loadChatGptExportIngestStore(storage)
  const synced = new Set(store.syncedConversationIds)
  const conversations = parseChatGptExportJson(options.raw)

  const indexedConversations: ChatGptExportIngestResult['conversations'] = []
  const errors: ChatGptExportIngestResult['errors'] = []
  let indexed = 0
  let skipped = 0
  let failed = 0

  for (const conversation of conversations) {
    try {
      if (!options.force && synced.has(conversation.id)) {
        skipped += 1
        continue
      }

      const plainText = conversationToPlainText(conversation)
      const sha256 = await sha256Hex(plainText)
      const result = indexTranscriptDocument({
        documentId: conversationDocumentId(conversation),
        sha256,
        title: conversation.title,
        url: `chatgpt://conversation/${conversation.id}`,
        plainText,
        tags: ['chatgpt', 'conversation', 'biohacking'],
        storage,
      })

      if (!result.chunks.length) {
        skipped += 1
        continue
      }

      synced.add(conversation.id)
      indexed += 1
      indexedConversations.push({
        id: conversation.id,
        title: conversation.title,
        chunks: result.chunks.length,
        messages: conversation.messages.length,
      })
    } catch (cause) {
      failed += 1
      errors.push({
        id: conversation.id,
        message: cause instanceof Error ? cause.message : 'ChatGPT ingest failed',
      })
    }
  }

  store = {
    ...store,
    syncedConversationIds: [...synced],
    lastSyncedAt: new Date().toISOString(),
    lastError: errors[0]?.message,
  }
  saveChatGptExportIngestStore(store, storage)

  return { indexed, skipped, failed, conversations: indexedConversations, errors, store }
}

export async function ingestChatGptExportFile(options: {
  file: File
  force?: boolean
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  unzip?: (bytes: Uint8Array) => Promise<Array<{ name: string; bytes: Uint8Array }>>
}): Promise<ChatGptExportIngestResult> {
  const bytes = new Uint8Array(await options.file.arrayBuffer())
  const name = options.file.name.toLowerCase()

  if (name.endsWith('.zip')) {
    const entries = options.unzip
      ? await options.unzip(bytes)
      : await unzipChatGptExport(bytes)
    const jsonEntry = entries.find((entry) => entry.name.toLowerCase().endsWith('conversations.json'))
      ?? entries.find((entry) => entry.name.toLowerCase().endsWith('.json'))
    if (!jsonEntry) {
      throw new Error('No conversations.json found in ChatGPT export zip')
    }
    const raw = JSON.parse(new TextDecoder().decode(jsonEntry.bytes))
    return ingestChatGptExportJson({ raw, force: options.force, storage: options.storage })
  }

  if (name.endsWith('.json')) {
    const raw = JSON.parse(new TextDecoder().decode(bytes))
    return ingestChatGptExportJson({ raw, force: options.force, storage: options.storage })
  }

  throw new Error('Unsupported file type. Upload a ChatGPT export .json or .zip file.')
}

async function unzipChatGptExport(bytes: Uint8Array): Promise<Array<{ name: string; bytes: Uint8Array }>> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('ZIP extraction is not supported in this browser. Upload conversations.json directly.')
  }

  const entries: Array<{ name: string; bytes: Uint8Array }> = []
  let offset = 0

  while (offset + 30 <= bytes.length) {
    const signature = readUint32(bytes, offset)
    if (signature !== 0x04034b50) break

    const compression = readUint16(bytes, offset + 8)
    const compressedSize = readUint32(bytes, offset + 18)
    const fileNameLength = readUint16(bytes, offset + 26)
    const extraLength = readUint16(bytes, offset + 28)
    const nameStart = offset + 30
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + fileNameLength))
    const dataStart = nameStart + fileNameLength + extraLength
    const compressed = bytes.slice(dataStart, dataStart + compressedSize)

    if (compression === 0) {
      entries.push({ name, bytes: compressed })
    } else if (compression === 8) {
      const decompressed = await inflateDeflateRaw(compressed)
      entries.push({ name, bytes: decompressed })
    }

    offset = dataStart + compressedSize
  }

  return entries
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)
  ) >>> 0
}

async function inflateDeflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}
