import {
  listChannelVideoUrls,
  listPlaylistVideoUrls,
  parsePlaylistId,
} from './adapters/youtube-playlist-adapter'
import { listSubscriptionVideoUrls } from './adapters/youtube-api-adapter'
import { isGoogleServiceConnected } from './oauth/google-token-store'
import { indexYouTubeUrlsToRag } from './youtube-rag-sync'

export type YouTubeScheduleSourceType = 'playlist' | 'channel' | 'subscriptions'

export type YouTubeScheduleSource = {
  id: string
  type: YouTubeScheduleSourceType
  url: string
  label: string
  enabled: boolean
  maxVideos: number
}

export type YouTubeSchedulerStore = {
  schemaVersion: 1
  enabled: boolean
  intervalHours: number
  sources: YouTubeScheduleSource[]
  lastRunAt?: string
  lastRunSummary?: string
  lastError?: string
}

const STORAGE_KEY = 'ubermensch:youtube-scheduler:v1'
const DEFAULT_INTERVAL_HOURS = 168

export function emptyYouTubeSchedulerStore(): YouTubeSchedulerStore {
  return { schemaVersion: 1, enabled: false, intervalHours: DEFAULT_INTERVAL_HOURS, sources: [] }
}

export function loadYouTubeSchedulerStore(storage: Pick<Storage, 'getItem'> = localStorage): YouTubeSchedulerStore {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyYouTubeSchedulerStore()
    const parsed = JSON.parse(raw) as YouTubeSchedulerStore
    return parsed.schemaVersion === 1 ? parsed : emptyYouTubeSchedulerStore()
  } catch {
    return emptyYouTubeSchedulerStore()
  }
}

export function saveYouTubeSchedulerStore(
  store: YouTubeSchedulerStore,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function scheduleSourceKey(source: Pick<YouTubeScheduleSource, 'type' | 'url'>): string {
  if (source.type === 'subscriptions') return 'subscriptions'
  if (source.type === 'playlist') {
    return `playlist:${parsePlaylistId(source.url) ?? source.url.trim()}`
  }
  return `channel:${source.url.trim().replace(/\/+$/, '').toLowerCase()}`
}

export function addYouTubeScheduleSource(
  input: Omit<YouTubeScheduleSource, 'id'>,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): YouTubeSchedulerStore {
  const store = loadYouTubeSchedulerStore(storage)
  const key = scheduleSourceKey(input)
  if (store.sources.some((source) => scheduleSourceKey(source) === key)) return store
  const next = {
    ...store,
    sources: [
      ...store.sources,
      { ...input, id: `yt_src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` },
    ],
  }
  saveYouTubeSchedulerStore(next, storage)
  return next
}

export function removeYouTubeScheduleSource(
  sourceId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): YouTubeSchedulerStore {
  const store = loadYouTubeSchedulerStore(storage)
  const next = { ...store, sources: store.sources.filter((source) => source.id !== sourceId) }
  saveYouTubeSchedulerStore(next, storage)
  return next
}

export function isYouTubeSchedulerDue(store: YouTubeSchedulerStore, now = Date.now()): boolean {
  if (!store.enabled) return false
  if (!store.lastRunAt) return true
  const elapsedHours = (now - Date.parse(store.lastRunAt)) / (1000 * 60 * 60)
  return elapsedHours >= store.intervalHours
}

async function resolveSourceUrls(source: YouTubeScheduleSource): Promise<string[]> {
  if (source.type === 'playlist') {
    return listPlaylistVideoUrls({ playlistUrlOrId: source.url, maxVideos: source.maxVideos })
  }
  if (source.type === 'channel') {
    return listChannelVideoUrls({ channelUrl: source.url, maxVideos: source.maxVideos })
  }
  if (source.type === 'subscriptions') {
    if (!(await isGoogleServiceConnected('youtube'))) {
      throw new Error('YouTube subscriptions require Google/YouTube OAuth on Connectors.')
    }
    return listSubscriptionVideoUrls(source.maxVideos, 10)
  }
  return []
}

export type YouTubeSchedulerRunResult = {
  indexed: number
  skipped: number
  failed: number
  sourcesProcessed: number
  store: YouTubeSchedulerStore
}

export async function runYouTubeScheduler(options?: {
  force?: boolean
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}): Promise<YouTubeSchedulerRunResult> {
  const storage = options?.storage ?? localStorage
  let store = loadYouTubeSchedulerStore(storage)
  if (!options?.force && !isYouTubeSchedulerDue(store)) {
    return { indexed: 0, skipped: 0, failed: 0, sourcesProcessed: 0, store }
  }

  const activeSources = store.sources.filter((source) => source.enabled)
  const allUrls = new Set<string>()
  let lastError: string | undefined

  for (const source of activeSources) {
    try {
      const urls = await resolveSourceUrls(source)
      for (const url of urls) allUrls.add(url)
    } catch (cause) {
      lastError = cause instanceof Error ? cause.message : 'Scheduler source failed'
    }
  }

  const result = await indexYouTubeUrlsToRag({
    urls: [...allUrls],
    storage,
  })

  store = {
    ...store,
    lastRunAt: new Date().toISOString(),
    lastRunSummary: `Indexed ${result.indexed}, skipped ${result.skipped}, failed ${result.failed} from ${activeSources.length} source(s).`,
    lastError: lastError ?? result.errors[0]?.message,
  }
  saveYouTubeSchedulerStore(store, storage)

  return {
    indexed: result.indexed,
    skipped: result.skipped,
    failed: result.failed,
    sourcesProcessed: activeSources.length,
    store,
  }
}
