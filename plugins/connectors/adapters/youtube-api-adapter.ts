import { getValidGoogleAccessToken } from '../oauth/google-token-store'
import { youTubeWatchUrl } from './youtube-transcript-adapter'

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

type YouTubeListResponse<T> = {
  items?: T[]
  nextPageToken?: string
}

function apiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const error = (payload as { error?: unknown }).error
  if (!error || typeof error !== 'object') return undefined
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : undefined
}

async function youtubeGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = await getValidGoogleAccessToken()
  const query = new URLSearchParams(params)
  const response = await fetch(`${YOUTUBE_API}${path}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(apiErrorMessage(payload) ?? `YouTube API ${response.status}`)
  }
  return payload as T
}

export type YouTubeSubscription = {
  channelId: string
  title: string
  description?: string
}

export type YouTubePlaylistItem = {
  videoId: string
  title: string
  publishedAt?: string
}

export async function listYouTubeSubscriptions(limit = 25): Promise<YouTubeSubscription[]> {
  if (limit <= 0) return []
  const subscriptions = new Map<string, YouTubeSubscription>()
  let pageToken: string | undefined

  do {
    const params: Record<string, string> = {
      part: 'snippet',
      mine: 'true',
      maxResults: String(Math.min(limit - subscriptions.size, 50)),
    }
    if (pageToken) params.pageToken = pageToken
    const payload = await youtubeGet<YouTubeListResponse<{
      snippet: { title: string; description?: string; resourceId: { channelId?: string } }
    }>>('/subscriptions', params)
    for (const item of payload.items ?? []) {
      const channelId = item.snippet.resourceId.channelId
      if (!channelId || subscriptions.has(channelId)) continue
      subscriptions.set(channelId, {
        channelId,
        title: item.snippet.title,
        description: item.snippet.description,
      })
    }
    pageToken = payload.nextPageToken
  } while (pageToken && subscriptions.size < limit)

  return [...subscriptions.values()].slice(0, limit)
}

export async function listChannelUploadPlaylistId(channelId: string): Promise<string | null> {
  const playlists = await listChannelUploadPlaylistIds([channelId])
  return playlists.get(channelId) ?? null
}

export async function listChannelUploadPlaylistIds(channelIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(channelIds.filter(Boolean))]
  const playlists = new Map<string, string>()
  for (let offset = 0; offset < uniqueIds.length; offset += 50) {
    const batch = uniqueIds.slice(offset, offset + 50)
    if (!batch.length) continue
    const payload = await youtubeGet<YouTubeListResponse<{
      id?: string
      contentDetails?: { relatedPlaylists?: { uploads?: string } }
    }>>('/channels', {
      part: 'contentDetails',
      id: batch.join(','),
    })
    for (const item of payload.items ?? []) {
      const playlistId = item.contentDetails?.relatedPlaylists?.uploads
      if (item.id && playlistId) playlists.set(item.id, playlistId)
    }
  }
  return playlists
}

export async function listPlaylistItems(playlistId: string, limit = 10): Promise<YouTubePlaylistItem[]> {
  if (limit <= 0) return []
  const items = new Map<string, YouTubePlaylistItem>()
  let pageToken: string | undefined

  do {
    const params: Record<string, string> = {
      part: 'snippet',
      playlistId,
      maxResults: String(Math.min(limit - items.size, 50)),
    }
    if (pageToken) params.pageToken = pageToken
    const payload = await youtubeGet<YouTubeListResponse<{
      snippet: {
        title: string
        publishedAt?: string
        resourceId?: { videoId?: string }
      }
    }>>('/playlistItems', params)
    for (const item of payload.items ?? []) {
      const videoId = item.snippet.resourceId?.videoId
      if (!videoId || items.has(videoId)) continue
      items.set(videoId, {
        videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
      })
    }
    pageToken = payload.nextPageToken
  } while (pageToken && items.size < limit)

  return [...items.values()].slice(0, limit)
}

export async function listSubscriptionVideoUrls(limitPerChannel = 3, maxChannels = 10): Promise<string[]> {
  const subscriptions = await listYouTubeSubscriptions(maxChannels)
  const uploadPlaylists = await listChannelUploadPlaylistIds(subscriptions.map((item) => item.channelId))
  const urls = new Set<string>()
  for (const subscription of subscriptions) {
    const uploadsPlaylistId = uploadPlaylists.get(subscription.channelId)
    if (!uploadsPlaylistId) continue
    const items = await listPlaylistItems(uploadsPlaylistId, limitPerChannel)
    for (const item of items) urls.add(youTubeWatchUrl(item.videoId))
  }
  return [...urls]
}
