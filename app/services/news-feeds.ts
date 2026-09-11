export const NEWS_FEED_CATALOG = [
  {
    id: 'nih',
    name: 'NIH News Releases',
    agency: 'U.S. National Institutes of Health',
    url: 'https://www.nih.gov/news-releases/news-release-rss.xml',
    topic: 'public-agency',
  },
  {
    id: 'nia',
    name: 'NIA News',
    agency: 'U.S. National Institute on Aging',
    url: 'https://www.nia.nih.gov/news/rss.xml',
    topic: 'longevity',
  },
  {
    id: 'cdc',
    name: 'CDC Newsroom',
    agency: 'U.S. Centers for Disease Control and Prevention',
    url: 'https://tools.cdc.gov/api/v2/resources/media/132608.rss',
    topic: 'public-agency',
  },
  {
    id: 'who',
    name: 'WHO News',
    agency: 'World Health Organization',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    topic: 'public-agency',
  },
  {
    id: 'fda',
    name: 'FDA Press Releases',
    agency: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    topic: 'public-agency',
  },
  {
    id: 'medlineplus',
    name: 'MedlinePlus Health News',
    agency: 'U.S. National Library of Medicine',
    url: 'https://medlineplus.gov/feeds/whatsnew.xml',
    topic: 'science',
  },
] as const

export type NewsFeedId = (typeof NEWS_FEED_CATALOG)[number]['id']

export interface NewsFeedSource {
  id: string
  name: string
  agency: string
  url: string
  topic: string
}

export interface NewsItem {
  id: string
  sourceId: string
  sourceName: string
  title: string
  url: string
  publishedAt: string | null
  excerpt: string
}

export interface NewsSourceError {
  sourceId: string
  sourceName: string
  message: string
}

export interface NewsDigest {
  items: NewsItem[]
  sources: NewsFeedSource[]
  errors: NewsSourceError[]
  fetchedAt: string
  ranking: 'published-time'
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === '#') {
        const code = entity[1]?.toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : match
      }
      return ENTITIES[entity.toLowerCase()] ?? match
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, name: string): string | undefined {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return match?.[1] ? decodeXml(match[1]) : undefined
}

function attr(block: string, name: string, attribute: string): string | undefined {
  const match = block.match(new RegExp(`<${name}[^>]*\\s${attribute}=["']([^"']+)["'][^>]*\\/?>`, 'i'))
  return match?.[1]?.trim()
}

function firstLink(block: string): string | undefined {
  return attr(block, 'link', 'href') || tag(block, 'link') || tag(block, 'guid') || tag(block, 'id')
}

function parseTimestamp(value: string | undefined): string | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : new Date(time).toISOString()
}

function excerptOf(value: string | undefined, limit = 220): string {
  if (!value) return ''
  return value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`
}

function blocks(xml: string, tagName: string): string[] {
  const matches = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tagName}>`, 'gi'))
  return matches ?? []
}

export function newsFeedById(id: string): NewsFeedSource | undefined {
  return NEWS_FEED_CATALOG.find((item) => item.id === id)
}

export function parseRssOrAtom(xml: string, source: NewsFeedSource): NewsItem[] {
  if (typeof xml !== 'string' || !xml.trim()) return []
  const entries = [...blocks(xml, 'item'), ...blocks(xml, 'entry')]
  const items: NewsItem[] = []
  for (const [index, entry] of entries.entries()) {
    const title = tag(entry, 'title')
    const url = firstLink(entry)
    if (!title || !url || !/^https?:\/\//i.test(url)) continue
    const publishedAt = parseTimestamp(
      tag(entry, 'pubDate') || tag(entry, 'published') || tag(entry, 'updated') || tag(entry, 'dc:date'),
    )
    items.push({
      id: `${source.id}:${url}:${index}`,
      sourceId: source.id,
      sourceName: source.name,
      title,
      url,
      publishedAt,
      excerpt: excerptOf(tag(entry, 'description') || tag(entry, 'summary') || tag(entry, 'content')),
    })
  }
  return items
}

export function mergeNewsItems(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const unique: NewsItem[] = []
  for (const item of items) {
    const key = item.url
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  return unique.sort((left, right) => {
    const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : 0
    const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : 0
    if (leftTime !== rightTime) return rightTime - leftTime
    return left.sourceName.localeCompare(right.sourceName) || left.title.localeCompare(right.title)
  })
}

export async function fetchPublicNewsFeeds(options?: {
  fetchImpl?: typeof fetch
  now?: string
  timeoutMs?: number
  perFeedLimit?: number
}): Promise<NewsDigest> {
  const fetchImpl = options?.fetchImpl ?? fetch
  const timeoutMs = options?.timeoutMs ?? 8000
  const perFeedLimit = options?.perFeedLimit ?? 8
  const fetchedAt = options?.now ?? new Date().toISOString()
  const items: NewsItem[] = []
  const errors: NewsSourceError[] = []

  await Promise.all(NEWS_FEED_CATALOG.map(async (source) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(source.url, {
        signal: controller.signal,
        headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const xml = await response.text()
      items.push(...parseRssOrAtom(xml, source).slice(0, perFeedLimit))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Feed fetch failed'
      errors.push({
        sourceId: source.id,
        sourceName: source.name,
        message: message.includes('abort') ? 'Timed out' : message,
      })
    } finally {
      clearTimeout(timer)
    }
  }))

  return {
    items: mergeNewsItems(items),
    sources: NEWS_FEED_CATALOG.map((item) => ({ ...item })),
    errors,
    fetchedAt,
    ranking: 'published-time',
  }
}
