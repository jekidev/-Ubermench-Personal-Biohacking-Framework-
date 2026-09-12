import {
  NEWS_FEEDS_API_PATH,
  catalogNewsSources,
  fetchPublicNewsFeeds,
  newsApiUnavailableMessage,
  parseNewsDigestPayload,
  type NewsDigest,
} from '~/services/news-feeds'

export function emptyNewsDigest(now = new Date().toISOString()): NewsDigest {
  return {
    items: [],
    sources: catalogNewsSources(),
    errors: [],
    fetchedAt: now,
    ranking: 'published-time',
  }
}

export async function loadNewsDigest(options?: {
  fetchImpl?: typeof fetch
  fallbackFetch?: typeof fetchPublicNewsFeeds
}): Promise<{ digest: NewsDigest; error: string }> {
  const fetchImpl = options?.fetchImpl ?? fetch
  const fallbackFetch = options?.fallbackFetch ?? fetchPublicNewsFeeds

  try {
    const response = await fetchImpl(NEWS_FEEDS_API_PATH, { headers: { Accept: 'application/json' } })
    const raw = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      parsed = undefined
    }
    const digest = parseNewsDigestPayload(parsed)
    if (response.ok && digest) {
      const error = !digest.items.length && digest.errors.length
        ? digest.errors.map((item) => `${item.sourceName}: ${item.message}`).join(' · ')
        : ''
      return { digest, error }
    }
    const fallback = await fallbackFetch()
    if (fallback.items.length) return { digest: fallback, error: '' }
    return {
      digest: {
        ...fallback,
        sources: fallback.sources.length ? fallback.sources : catalogNewsSources(),
      },
      error: newsApiUnavailableMessage(response.status),
    }
  } catch (cause) {
    try {
      const fallback = await fallbackFetch()
      if (fallback.items.length) return { digest: fallback, error: '' }
      return {
        digest: {
          ...fallback,
          sources: fallback.sources.length ? fallback.sources : catalogNewsSources(),
        },
        error: cause instanceof Error ? `${cause.message}. ${newsApiUnavailableMessage()}` : newsApiUnavailableMessage(),
      }
    } catch (fallback) {
      return {
        digest: emptyNewsDigest(),
        error: fallback instanceof Error ? fallback.message : newsApiUnavailableMessage(),
      }
    }
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
      const result = await loadNewsDigest()
      digest.value = result.digest
      error.value = result.error
      return digest.value
    } finally {
      loading.value = false
    }
  }

  return { digest, loading, error, refresh }
}
