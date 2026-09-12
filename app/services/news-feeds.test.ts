import { describe, expect, it } from 'vitest'
import {
  NEWS_FEED_CATALOG,
  catalogNewsSources,
  feedUrlsFor,
  fetchPublicNewsFeeds,
  looksLikeFeedXml,
  mergeNewsItems,
  newsApiUnavailableMessage,
  newsFeedById,
  parseNewsDigestPayload,
  parseRssOrAtom,
} from './news-feeds'

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>NIA News</title>
    <item>
      <title>Sleep study published</title>
      <link>https://www.nia.nih.gov/news/sleep-study</link>
      <pubDate>Thu, 11 Sep 2026 08:00:00 GMT</pubDate>
      <description><![CDATA[<p>A short public excerpt about sleep.</p>]]></description>
    </item>
    <item>
      <title>Missing link is dropped</title>
      <description>No URL</description>
    </item>
  </channel>
</rss>`

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>DHSC News</title>
  <entry>
    <title>Aging research update</title>
    <link href="https://www.gov.uk/news/aging-update" rel="alternate"/>
    <updated>2026-09-10T12:00:00Z</updated>
    <summary>Agency summary without ranking signals.</summary>
  </entry>
</feed>`

describe('news-feeds', () => {
  it('parses RSS and Atom with source + timestamp + excerpt', () => {
    const nia = newsFeedById('nia')!
    const dhsc = newsFeedById('dhsc')!
    const rss = parseRssOrAtom(RSS, nia)
    const atom = parseRssOrAtom(ATOM, dhsc)
    expect(rss).toHaveLength(1)
    expect(rss[0]).toMatchObject({
      sourceName: 'NIA News',
      title: 'Sleep study published',
      url: 'https://www.nia.nih.gov/news/sleep-study',
      publishedAt: '2026-09-11T08:00:00.000Z',
    })
    expect(rss[0]?.excerpt).toContain('public excerpt')
    expect(atom[0]).toMatchObject({
      sourceName: 'UK DHSC News',
      url: 'https://www.gov.uk/news/aging-update',
      publishedAt: '2026-09-10T12:00:00.000Z',
    })
  })

  it('merges by published time only — no engagement ranking', () => {
    const merged = mergeNewsItems([
      { id: 'b', sourceId: 'dhsc', sourceName: 'UK DHSC News', title: 'Older', url: 'https://example.org/b', publishedAt: '2026-09-01T00:00:00.000Z', excerpt: '' },
      { id: 'a', sourceId: 'nia', sourceName: 'NIA News', title: 'Newer', url: 'https://example.org/a', publishedAt: '2026-09-11T00:00:00.000Z', excerpt: '' },
      { id: 'dup', sourceId: 'nia', sourceName: 'NIA News', title: 'Dup', url: 'https://example.org/a', publishedAt: '2026-09-12T00:00:00.000Z', excerpt: '' },
    ])
    expect(merged.map((item) => item.title)).toEqual(['Newer', 'Older'])
  })

  it('keeps live public-agency URLs and fallbacks for WAF-prone hosts', () => {
    expect(NEWS_FEED_CATALOG.map((item) => item.id)).toEqual(expect.arrayContaining(['nia', 'dhsc', 'cdc', 'who', 'ema', 'medlineplus', 'ssi']))
    expect(feedUrlsFor(newsFeedById('nia')!)).toContain('https://www.nih.gov/rss.xml')
    expect(feedUrlsFor(newsFeedById('ema')!)).toContain('https://www.ema.europa.eu/en/news.xml')
    expect(catalogNewsSources()).toHaveLength(NEWS_FEED_CATALOG.length)
  })

  it('rejects HTML/WAF bodies so a 200 apology page is not parsed as news', () => {
    expect(looksLikeFeedXml(RSS)).toBe(true)
    expect(looksLikeFeedXml(ATOM)).toBe(true)
    expect(looksLikeFeedXml('<!DOCTYPE html><html><title>FDA Apology</title></html>')).toBe(false)
    expect(looksLikeFeedXml('<html lang="en"><body>abuse-detection</body></html>')).toBe(false)
  })

  it('fetches only the allowlisted catalog, tries fallback URLs, and records per-source errors', async () => {
    const digest = await fetchPublicNewsFeeds({
      now: '2026-09-11T12:00:00.000Z',
      fetchImpl: async (input) => {
        const url = String(input)
        if (url.includes('nih.gov/rss.xml')) {
          return new Response('<!DOCTYPE html><html>blocked</html>', { status: 403 })
        }
        if (url.includes('nia.nih.gov/news/rss.xml')) {
          return new Response(RSS, { status: 200 })
        }
        return new Response('nope', { status: 503 })
      },
    })
    expect(digest.ranking).toBe('published-time')
    expect(digest.items[0]?.sourceName).toBe('NIA News')
    expect(digest.errors.some((item) => item.sourceId === 'cdc')).toBe(true)
    expect(digest.sources).toHaveLength(NEWS_FEED_CATALOG.length)
  })

  it('parses the Nitro JSON contract and explains a missing API for Android Chrome', () => {
    expect(parseNewsDigestPayload({ hello: 'nope' })).toBeUndefined()
    const digest = parseNewsDigestPayload({
      items: [],
      errors: [{ sourceId: 'cdc', sourceName: 'CDC Newsroom', message: 'HTTP 503' }],
      sources: [],
      fetchedAt: '2026-09-12T09:00:00.000Z',
      ranking: 'published-time',
    })
    expect(digest?.sources).toHaveLength(NEWS_FEED_CATALOG.length)
    expect(newsApiUnavailableMessage(404)).toMatch(/\/api\/news\/feeds/)
    expect(newsApiUnavailableMessage(404)).toMatch(/CORS/)
  })
})
