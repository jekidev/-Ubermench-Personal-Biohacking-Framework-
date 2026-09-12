export const NEWS_FEEDS_API_PATH = '/api/news/feeds'

export const NEWS_FEED_CATALOG = [
  {
    id: 'nia',
    name: 'NIA News',
    agency: 'U.S. National Institute on Aging',
    url: 'https://www.nia.nih.gov/news/rss.xml',
    urls: [
      'https://www.nia.nih.gov/news/rss.xml',
      'https://www.nih.gov/rss.xml',
    ],
    topic: 'public-agency',
  },
  {
    id: 'dhsc',
    name: 'UK DHSC News',
    agency: 'U.K. Department of Health and Social Care',
    url: 'https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=department-of-health-and-social-care',
    urls: [
      'https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=department-of-health-and-social-care',
    ],
    topic: 'public-agency',
  },
  {
    id: 'cdc',
    name: 'CDC Newsroom',
    agency: 'U.S. Centers for Disease Control and Prevention',
    url: 'https://tools.cdc.gov/api/v2/resources/media/132608.rss',
    urls: [
      'https://tools.cdc.gov/api/v2/resources/media/132608.rss',
    ],
    topic: 'public-agency',
  },
  {
    id: 'who',
    name: 'WHO News',
    agency: 'World Health Organization',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    urls: [
      'https://www.who.int/rss-feeds/news-english.xml',
    ],
    topic: 'public-agency',
  },
  {
    id: 'ema',
    name: 'EMA News',
    agency: 'European Medicines Agency',
    url: 'https://www.ema.europa.eu/en/news.xml',
    urls: [
      'https://www.ema.europa.eu/en/news.xml',
      'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    ],
    topic: 'public-agency',
  },
  {
    id: 'medlineplus',
    name: 'MedlinePlus Health News',
    agency: 'U.S. National Library of Medicine',
    url: 'https://medlineplus.gov/feeds/whatsnew.xml',
    urls: [
      'https://medlineplus.gov/feeds/whatsnew.xml',
      'https://www.medlineplus.gov/feeds/whatsnew.xml',
    ],
    topic: 'science',
  },
  {
    id: 'ssi',
    name: 'SSI Nyheder',
    agency: 'Statens Serum Institut',
    url: 'https://www.ssi.dk/aktuelt/nyheder/rss',
    urls: [
      'https://www.ssi.dk/aktuelt/nyheder/rss',
    ],
    topic: 'public-agency',
  },
] as const

export type NewsFeedId = (typeof NEWS_FEED_CATALOG)[number]['id']

export interface NewsFeedSource {
  id: string
  name: string
  agency: string
  url: string
  urls?: readonly string[]
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

const NEWS_FETCH_HEADERS = {
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14; UbermenchNews/1.1) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36',
} as const

const MAX_FEED_CHARS = 400_000

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

export function catalogNewsSources(): NewsFeedSource[] {
  return NEWS_FEED_CATALOG.map((item) => ({
    id: item.id,
    name: item.name,
    agency: item.agency,
    url: item.url,
    urls: [...item.urls],
    topic: item.topic,
  }))
}

export function feedUrlsFor(source: NewsFeedSource): string[] {
  const extras = source.urls ?? []
  return [...new Set([source.url, ...extras].filter(Boolean))]
}

export function looksLikeFeedXml(text: string): boolean {
  if (typeof text !== 'string') return false
  const trimmed = text.trimStart()
  if (!trimmed) return false
  if (/^<!DOCTYPE html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return false
  if (/abuse-detection|just a moment|access denied|apology_objects/i.test(trimmed.slice(0, 2000))) {
    return false
  }
  return /<(rss|feed|rdf:RDF)\b/i.test(trimmed.slice(0, 4000))
}

export function isNewsDigest(value: unknown): value is NewsDigest {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.items)
    && Array.isArray(record.errors)
    && Array.isArray(record.sources)
    && record.ranking === 'published-time'
}

export function parseNewsDigestPayload(value: unknown): NewsDigest | undefined {
  if (!isNewsDigest(value)) return undefined
  return {
    items: value.items,
    sources: value.sources.length ? value.sources : catalogNewsSources(),
    errors: value.errors,
    fetchedAt: typeof value.fetchedAt === 'string' ? value.fetchedAt : new Date().toISOString(),
    ranking: 'published-time',
  }
}

export function newsApiUnavailableMessage(status?: number): string {
  const statusBit = status && status !== 200 ? `HTTP ${status}. ` : ''
  return `${statusBit}Android Chrome needs the Nuxt ${NEWS_FEEDS_API_PATH} route (this preview). Direct RSS is blocked by CORS. Reload the Nitro preview — a static host without that API cannot load headlines.`
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

async function readFeedBody(response: Response): Promise<string> {
  const text = await response.text()
  return text.length > MAX_FEED_CHARS ? text.slice(0, MAX_FEED_CHARS) : text
}

async function fetchFeedXml(
  source: NewsFeedSource,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<string> {
  const attempts: string[] = []
  for (const url of feedUrlsFor(source)) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: NEWS_FETCH_HEADERS,
      })
      if (!response.ok) {
        attempts.push(`${url} → HTTP ${response.status}`)
        continue
      }
      const xml = await readFeedBody(response)
      if (!looksLikeFeedXml(xml)) {
        attempts.push(`${url} → not RSS/Atom (WAF or HTML)`)
        continue
      }
      return xml
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Feed fetch failed'
      attempts.push(`${url} → ${message.includes('abort') ? 'Timed out' : message}`)
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(attempts.join(' · ') || 'Feed fetch failed')
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
    try {
      const xml = await fetchFeedXml(source, fetchImpl, timeoutMs)
      items.push(...parseRssOrAtom(xml, source).slice(0, perFeedLimit))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Feed fetch failed'
      errors.push({
        sourceId: source.id,
        sourceName: source.name,
        message,
      })
    }
  }))

  return {
    items: mergeNewsItems(items),
    sources: catalogNewsSources(),
    errors,
    fetchedAt,
    ranking: 'published-time',
  }
}
