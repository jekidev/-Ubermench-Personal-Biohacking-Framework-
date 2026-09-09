import { getValidGoogleAccessToken } from '../oauth/google-token-store'
import { youTubeWatchUrl } from './youtube-transcript-adapter'

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

type YouTubeListResponse<T> = {
  items?: T[]
  nextPageToken?: string
}

async function youtubeGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = await getValidGoogleAccessToken()
  const query = new URLSearchParams({ ...params, key: '' })
  query.delete('key')
  const response = await fetch(`${YOUTUBE_API}${path}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `YouTube API ${response.status}`)
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
  const payload = await youtubeGet<YouTubeListResponse<{
    snippet: { title: string; description?: string; resourceId: { channelId?: string } }
  }>>('/subscriptions', {
    part: 'snippet',
    mine: 'true',
    maxResults: String(Math.min(limit, 50)),
  })
  return (payload.items ?? [])
    .map((item) => ({
      channelId: item.snippet.resourceId.channelId ?? '',
      title: item.snippet.title,
      description: item.snippet.description,
    }))
    .filter((item) => item.channelId)
}

export async function listChannelUploadPlaylistId(channelId: string): Promise<string | null> {
  const payload = await youtubeGet<YouTubeListResponse<{
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }>>('/channels', {
    part: 'contentDetails',
    id: channelId,
  })
  return payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null
}

export async function listPlaylistItems(playlistId: string, limit = 10): Promise<YouTubePlaylistItem[]> {
  const payload = await youtubeGet<YouTubeListResponse<{
    snippet: {
      title: string
      publishedAt?: string
      resourceId?: { videoId?: string }
    }
  }>>('/playlistItems', {
    part: 'snippet',
    playlistId,
    maxResults: String(Math.min(limit, 50)),
  })
  return (payload.items ?? [])
    .map((item) => ({
      videoId: item.snippet.resourceId?.videoId ?? '',
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
    }))
    .filter((item) => item.videoId)
}

export async function listSubscriptionVideoUrls(limitPerChannel = 3, maxChannels = 10): Promise<string[]> {
  const subscriptions = await listYouTubeSubscriptions(maxChannels)
  const urls: string[] = []
  for (const subscription of subscriptions) {
    const uploadsPlaylistId = await listChannelUploadPlaylistId(subscription.channelId)
    if (!uploadsPlaylistId) continue
    const items = await listPlaylistItems(uploadsPlaylistId, limitPerChannel)
    for (const item of items) urls.push(youTubeWatchUrl(item.videoId))
  }
  return urls
}
