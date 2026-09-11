import { describe, expect, it } from 'vitest'
import {
  NEWS_FEED_CATALOG,
  fetchPublicNewsFeeds,
  mergeNewsItems,
  newsFeedById,
  parseRssOrAtom,
} from './news-feeds'

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>NIH News Releases</title>
    <item>
      <title>Sleep study published</title>
      <link>https://www.nih.gov/news-releases/sleep-study</link>
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
  <title>NIA News</title>
  <entry>
    <title>Aging research update</title>
    <link href="https://www.nia.nih.gov/news/aging-update" rel="alternate"/>
    <updated>2026-09-10T12:00:00Z</updated>
    <summary>Agency summary without ranking signals.</summary>
  </entry>
</feed>`

describe('news-feeds', () => {
  it('parses RSS and Atom with source + timestamp + excerpt', () => {
    const nih = newsFeedById('nih')!
    const nia = newsFeedById('nia')!
    const rss = parseRssOrAtom(RSS, nih)
    const atom = parseRssOrAtom(ATOM, nia)
    expect(rss).toHaveLength(1)
    expect(rss[0]).toMatchObject({
      sourceName: 'NIH News Releases',
      title: 'Sleep study published',
      url: 'https://www.nih.gov/news-releases/sleep-study',
      publishedAt: '2026-09-11T08:00:00.000Z',
    })
    expect(rss[0]?.excerpt).toContain('public excerpt')
    expect(atom[0]).toMatchObject({
      sourceName: 'NIA News',
      url: 'https://www.nia.nih.gov/news/aging-update',
      publishedAt: '2026-09-10T12:00:00.000Z',
    })
  })

  it('merges by published time only — no engagement ranking', () => {
    const merged = mergeNewsItems([
      { id: 'b', sourceId: 'nia', sourceName: 'NIA News', title: 'Older', url: 'https://example.org/b', publishedAt: '2026-09-01T00:00:00.000Z', excerpt: '' },
      { id: 'a', sourceId: 'nih', sourceName: 'NIH News Releases', title: 'Newer', url: 'https://example.org/a', publishedAt: '2026-09-11T00:00:00.000Z', excerpt: '' },
      { id: 'dup', sourceId: 'nih', sourceName: 'NIH News Releases', title: 'Dup', url: 'https://example.org/a', publishedAt: '2026-09-12T00:00:00.000Z', excerpt: '' },
    ])
    expect(merged.map((item) => item.title)).toEqual(['Newer', 'Older'])
  })

  it('fetches only the allowlisted catalog and records per-source errors', async () => {
    expect(NEWS_FEED_CATALOG.map((item) => item.id)).toContain('nih')
    const digest = await fetchPublicNewsFeeds({
      now: '2026-09-11T12:00:00.000Z',
      fetchImpl: async (input) => {
        const url = String(input)
        if (url.includes('nih.gov/news-releases')) {
          return new Response(RSS, { status: 200 })
        }
        return new Response('nope', { status: 503 })
      },
    })
    expect(digest.ranking).toBe('published-time')
    expect(digest.items[0]?.sourceName).toBe('NIH News Releases')
    expect(digest.errors.some((item) => item.sourceId === 'cdc')).toBe(true)
    expect(digest.sources).toHaveLength(NEWS_FEED_CATALOG.length)
  })
})
