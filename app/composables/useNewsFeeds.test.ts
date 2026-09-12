import { describe, expect, it } from 'vitest'
import { NEWS_FEED_CATALOG, type NewsDigest } from '~/services/news-feeds'
import { emptyNewsDigest, loadNewsDigest } from './useNewsFeeds'

const sampleDigest: NewsDigest = {
  items: [{
    id: 'nia:https://example.org/a:0',
    sourceId: 'nia',
    sourceName: 'NIA News',
    title: 'Sleep study',
    url: 'https://example.org/a',
    publishedAt: '2026-09-11T08:00:00.000Z',
    excerpt: 'Public excerpt',
  }],
  sources: [],
  errors: [{ sourceId: 'cdc', sourceName: 'CDC Newsroom', message: 'HTTP 503' }],
  fetchedAt: '2026-09-12T09:00:00.000Z',
  ranking: 'published-time',
}

describe('useNewsFeeds helpers', () => {
  it('keeps the catalog listed even before the first fetch', () => {
    expect(emptyNewsDigest('2026-09-12T09:00:00.000Z').sources).toHaveLength(NEWS_FEED_CATALOG.length)
  })

  it('uses /api/news/feeds JSON when Nitro answers, including per-source errors', async () => {
    const result = await loadNewsDigest({
      fetchImpl: async () => new Response(JSON.stringify({
        ...sampleDigest,
        sources: NEWS_FEED_CATALOG.map((item) => ({ ...item })),
      }), { status: 200 }),
    })
    expect(result.digest.items).toHaveLength(1)
    expect(result.digest.errors[0]?.sourceId).toBe('cdc')
    expect(result.error).toBe('')
  })

  it('falls back to direct RSS only when the API is missing, and still explains Android CORS', async () => {
    const result = await loadNewsDigest({
      fetchImpl: async () => new Response('<!DOCTYPE html>nuxt 404', { status: 404 }),
      fallbackFetch: async () => ({
        items: [],
        sources: [],
        errors: [{ sourceId: 'who', sourceName: 'WHO News', message: 'Failed to fetch' }],
        fetchedAt: '2026-09-12T09:00:00.000Z',
        ranking: 'published-time',
      }),
    })
    expect(result.digest.items).toHaveLength(0)
    expect(result.digest.sources).toHaveLength(NEWS_FEED_CATALOG.length)
    expect(result.error).toMatch(/\/api\/news\/feeds/)
  })

  it('keeps direct-RSS items if Chrome can reach a feed after the API fails', async () => {
    const result = await loadNewsDigest({
      fetchImpl: async () => { throw new Error('Failed to fetch') },
      fallbackFetch: async () => sampleDigest,
    })
    expect(result.digest.items[0]?.title).toBe('Sleep study')
    expect(result.error).toBe('')
  })
})
