import {
  fetchYouTubeTranscript,
  parseYouTubeUrlsFromText,
  type TextFetcher,
  youTubeWatchUrl,
} from './adapters/youtube-transcript-adapter'
import { indexTranscriptDocument } from '../longevity/rag/index-transcript'

export type YouTubeRagSyncStore = {
  schemaVersion: 1
  syncedVideoIds: string[]
  lastSyncedAt?: string
  lastError?: string
}

const STORAGE_KEY = 'ubermensch:youtube-rag-sync:v1'

export function emptyYouTubeRagSyncStore(): YouTubeRagSyncStore {
  return { schemaVersion: 1, syncedVideoIds: [] }
}

export function loadYouTubeRagSyncStore(storage: Pick<Storage, 'getItem'> = localStorage): YouTubeRagSyncStore {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyYouTubeRagSyncStore()
    const parsed = JSON.parse(raw) as YouTubeRagSyncStore
    return parsed.schemaVersion === 1 ? parsed : emptyYouTubeRagSyncStore()
  } catch {
    return emptyYouTubeRagSyncStore()
  }
}

export function saveYouTubeRagSyncStore(
  store: YouTubeRagSyncStore,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export type YouTubeRagSyncResult = {
  indexed: number
  skipped: number
  failed: number
  videos: Array<{ videoId: string; title: string; chunks: number; url: string }>
  errors: Array<{ videoId: string; message: string }>
  store: YouTubeRagSyncStore
}

export async function indexYouTubeUrlsToRag(options: {
  urls?: string[]
  text?: string
  language?: string
  force?: boolean
  fetchText?: TextFetcher
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}): Promise<YouTubeRagSyncResult> {
  const storage = options.storage ?? localStorage
  let store = loadYouTubeRagSyncStore(storage)
  const synced = new Set(store.syncedVideoIds)
  const urls = options.urls?.length
    ? options.urls
    : options.text
      ? parseYouTubeUrlsFromText(options.text)
      : []

  const videos: YouTubeRagSyncResult['videos'] = []
  const errors: YouTubeRagSyncResult['errors'] = []
  let indexed = 0
  let skipped = 0
  let failed = 0

  for (const url of urls) {
    try {
      const transcript = await fetchYouTubeTranscript({
        urlOrId: url,
        language: options.language,
        fetchText: options.fetchText,
      })

      if (!options.force && synced.has(transcript.videoId)) {
        skipped += 1
        continue
      }

      const sha256 = await sha256Hex(transcript.plainText)
      const result = indexTranscriptDocument({
        documentId: `youtube:${transcript.videoId}`,
        sha256,
        title: transcript.title,
        channel: transcript.channel,
        url: youTubeWatchUrl(transcript.videoId),
        language: transcript.language,
        plainText: transcript.plainText,
        tags: ['youtube', 'podcast', 'biohacking'],
        storage,
      })

      if (!result.chunks.length) {
        skipped += 1
        continue
      }

      synced.add(transcript.videoId)
      indexed += 1
      videos.push({
        videoId: transcript.videoId,
        title: transcript.title,
        chunks: result.chunks.length,
        url: youTubeWatchUrl(transcript.videoId),
      })
    } catch (cause) {
      failed += 1
      const videoId = url.match(/[a-zA-Z0-9_-]{11}/)?.[0] ?? url
      errors.push({
        videoId,
        message: cause instanceof Error ? cause.message : 'YouTube ingest failed',
      })
    }
  }

  store = {
    ...store,
    syncedVideoIds: [...synced],
    lastSyncedAt: new Date().toISOString(),
    lastError: errors[0]?.message,
  }
  saveYouTubeRagSyncStore(store, storage)

  return { indexed, skipped, failed, videos, errors, store }
}
