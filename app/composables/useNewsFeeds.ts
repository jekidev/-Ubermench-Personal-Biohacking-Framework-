import { fetchPublicNewsFeeds, type NewsDigest } from '~/services/news-feeds'

export function emptyNewsDigest(now = new Date().toISOString()): NewsDigest {
  return {
    items: [],
    sources: [],
    errors: [],
    fetchedAt: now,
    ranking: 'published-time',
  }
}

export function useNewsFeeds() {
  const digest = useState<NewsDigest>('news-feed-digest', () => emptyNewsDigest())
  const loading = useState<boolean>('news-feed-loading', () => false)
  const error = useState<string>('news-feed-error', () => '')

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const response = await fetch('/api/news/feeds', { headers: { Accept: 'application/json' } })
      if (response.ok) {
        digest.value = await response.json() as NewsDigest
        return digest.value
      }
      digest.value = await fetchPublicNewsFeeds()
      if (!digest.value.items.length && digest.value.errors.length) {
        error.value = 'Chrome blocked direct RSS (CORS). The Nuxt /api/news/feeds route is the Android path — reload on this preview, or the server is down.'
      }
      return digest.value
    } catch (cause) {
      try {
        digest.value = await fetchPublicNewsFeeds()
        if (!digest.value.items.length) {
          error.value = cause instanceof Error ? cause.message : 'News feeds could not be loaded on this phone.'
        }
        return digest.value
      } catch (fallback) {
        error.value = fallback instanceof Error ? fallback.message : 'News feeds could not be loaded on this phone.'
        digest.value = emptyNewsDigest()
        return digest.value
      }
    } finally {
      loading.value = false
    }
  }

  return { digest, loading, error, refresh }
}
