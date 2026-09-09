import { describe, expect, it } from 'vitest'
import {
  emptyYouTubeRagSyncStore,
  indexYouTubeUrlsToRag,
  loadYouTubeRagSyncStore,
  saveYouTubeRagSyncStore,
} from './youtube-rag-sync'
import { loadDocumentRagStore } from '../longevity/rag/document-index'

const SAMPLE_PAGE = `
<html><head><title>Sauna benefits - YouTube</title></head><body>
<script>"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc12345678&lang=en","languageCode":"en"}]}},"videoDetails":{"title":"Sauna benefits"}}</script>
"ownerChannelName":"Heat Science"
</body></html>
`

const SAMPLE_CAPTIONS = `
<transcript>
  <text start="0.0">Heat shock proteins improve recovery.</text>
  <text start="4.0">Start with lower temperatures.</text>
</transcript>
`

describe('youtube-rag-sync', () => {
  it('indexes transcript chunks and tracks synced video ids', async () => {
    const storage = new Map<string, string>()
    const fetchText = async (url: string) => {
      if (url.includes('watch?v=')) return SAMPLE_PAGE
      if (url.includes('timedtext')) return SAMPLE_CAPTIONS
      throw new Error(`Unexpected URL: ${url}`)
    }

    const result = await indexYouTubeUrlsToRag({
      urls: ['https://www.youtube.com/watch?v=abc12345678'],
      fetchText,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    })

    expect(result.indexed).toBe(1)
    expect(result.videos[0]?.chunks).toBeGreaterThan(0)
    expect(loadYouTubeRagSyncStore({
      getItem: (key) => storage.get(key) ?? null,
    }).syncedVideoIds).toContain('abc12345678')

    const ragStore = loadDocumentRagStore({
      getItem: (key) => storage.get(key) ?? null,
    })
    expect(ragStore.chunks.some((chunk) => chunk.tags.includes('biohacking'))).toBe(true)
  })

  it('persists sync store', () => {
    const storage = new Map<string, string>()
    const store = { ...emptyYouTubeRagSyncStore(), syncedVideoIds: ['abc12345678'] }
    saveYouTubeRagSyncStore(store, {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    })
    expect(loadYouTubeRagSyncStore({
      getItem: (key) => storage.get(key) ?? null,
    }).syncedVideoIds).toEqual(['abc12345678'])
  })
})
