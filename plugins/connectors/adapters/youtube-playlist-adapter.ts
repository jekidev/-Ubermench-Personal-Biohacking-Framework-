import { parseYouTubeVideoId, youTubeWatchUrl, type TextFetcher } from './youtube-transcript-adapter'

export function parsePlaylistId(input: string): string | null {
  const match = input.match(/[?&]list=([a-zA-Z0-9_-]+)/) ?? input.match(/^([a-zA-Z0-9_-]{10,})$/)
  return match?.[1] ?? null
}

export function parseChannelIdOrHandle(input: string): { channelId?: string; handle?: string } {
  const channelMatch = input.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i)
  if (channelMatch?.[1]) return { channelId: channelMatch[1] }
  const handleMatch = input.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/i)
  if (handleMatch?.[1]) return { handle: handleMatch[1] }
  return {}
}

function extractVideoIdsFromHtml(html: string, limit: number): string[] {
  const ids = new Set<string>()
  const pattern = /"videoId":"([a-zA-Z0-9_-]{11})"/g
  let match = pattern.exec(html)
  while (match && ids.size < limit) {
    if (match[1]) ids.add(match[1])
    match = pattern.exec(html)
  }
  return [...ids]
}

async function defaultTextFetcher(url: string): Promise<string> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string>('fetch_url_text', { url })
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.text()
}

export async function listPlaylistVideoUrls(input: {
  playlistUrlOrId: string
  maxVideos?: number
  fetchText?: TextFetcher
}): Promise<string[]> {
  const playlistId = parsePlaylistId(input.playlistUrlOrId) ?? input.playlistUrlOrId
  if (!playlistId) throw new Error('Invalid playlist URL or ID')
  const fetchText = input.fetchText ?? defaultTextFetcher
  const limit = input.maxVideos ?? 10
  const html = await fetchText(`https://www.youtube.com/playlist?list=${playlistId}`)
  return extractVideoIdsFromHtml(html, limit).map((videoId) => youTubeWatchUrl(videoId))
}

export async function listChannelVideoUrls(input: {
  channelUrl: string
  maxVideos?: number
  fetchText?: TextFetcher
}): Promise<string[]> {
  const fetchText = input.fetchText ?? defaultTextFetcher
  const limit = input.maxVideos ?? 10
  const { channelId, handle } = parseChannelIdOrHandle(input.channelUrl)
  const url = channelId
    ? `https://www.youtube.com/channel/${channelId}/videos`
    : handle
      ? `https://www.youtube.com/@${handle}/videos`
      : input.channelUrl
  const html = await fetchText(url)
  return extractVideoIdsFromHtml(html, limit).map((videoId) => youTubeWatchUrl(videoId))
}

export function normalizeYouTubeSourceUrl(input: string): string {
  const videoId = parseYouTubeVideoId(input)
  if (videoId) return youTubeWatchUrl(videoId)
  return input.trim()
}
