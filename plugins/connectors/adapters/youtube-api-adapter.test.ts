import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  listSubscriptionVideoUrls,
  listYouTubeSubscriptions,
} from './youtube-api-adapter'

vi.mock('../oauth/google-token-store', () => ({
  getValidGoogleAccessToken: vi.fn(async () => 'test-token'),
}))

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('YouTube API adapter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('paginates subscriptions and removes duplicate channels', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      if (!url.searchParams.has('pageToken')) {
        return jsonResponse({
          items: [
            { snippet: { title: 'One', resourceId: { channelId: 'channel-1' } } },
            { snippet: { title: 'One duplicate', resourceId: { channelId: 'channel-1' } } },
          ],
          nextPageToken: 'page-2',
        })
      }
      return jsonResponse({
        items: [{ snippet: { title: 'Two', resourceId: { channelId: 'channel-2' } } }],
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const subscriptions = await listYouTubeSubscriptions(2)

    expect(subscriptions.map((item) => item.channelId)).toEqual(['channel-1', 'channel-2'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('batches channel lookups and deduplicates videos across subscriptions', async () => {
    let channelRequests = 0
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/subscriptions')) {
        return jsonResponse({
          items: [
            { snippet: { title: 'One', resourceId: { channelId: 'channel-1' } } },
            { snippet: { title: 'Two', resourceId: { channelId: 'channel-2' } } },
          ],
        })
      }
      if (url.pathname.endsWith('/channels')) {
        channelRequests += 1
        expect(url.searchParams.get('id')).toBe('channel-1,channel-2')
        return jsonResponse({
          items: [
            { id: 'channel-1', contentDetails: { relatedPlaylists: { uploads: 'uploads-1' } } },
            { id: 'channel-2', contentDetails: { relatedPlaylists: { uploads: 'uploads-2' } } },
          ],
        })
      }
      const playlistId = url.searchParams.get('playlistId')
      return jsonResponse({
        items: [
          {
            snippet: {
              title: playlistId,
              resourceId: { videoId: 'shared12345' },
            },
          },
        ],
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const urls = await listSubscriptionVideoUrls(3, 2)

    expect(channelRequests).toBe(1)
    expect(urls).toEqual(['https://www.youtube.com/watch?v=shared12345'])
  })
})
