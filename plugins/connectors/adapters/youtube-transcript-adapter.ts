export type YouTubeVideoRef = {
  videoId: string
  url: string
}

export type YouTubeTranscriptSegment = {
  startMs: number
  text: string
}

export type YouTubeTranscriptResult = {
  videoId: string
  title: string
  channel?: string
  language: string
  segments: YouTubeTranscriptSegment[]
  plainText: string
}

export type TextFetcher = (url: string) => Promise<string>

const VIDEO_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
]

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function parseCaptionXml(xml: string): YouTubeTranscriptSegment[] {
  const segments: YouTubeTranscriptSegment[] = []
  const pattern = /<text start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g
  let match = pattern.exec(xml)
  while (match) {
    const startRaw = match[1]
    const bodyRaw = match[2]
    if (!startRaw || bodyRaw === undefined) {
      match = pattern.exec(xml)
      continue
    }
    const startSeconds = Number.parseFloat(startRaw)
    const text = decodeHtmlEntities(bodyRaw.replace(/<[^>]+>/g, '').trim())
    if (text) {
      segments.push({ startMs: Math.round(startSeconds * 1000), text })
    }
    match = pattern.exec(xml)
  }
  return segments
}

function extractCaptionTrackUrl(pageHtml: string, preferredLang = 'en'): string | null {
  const marker = '"captions":'
  const start = pageHtml.indexOf(marker)
  if (start < 0) return null

  const slice = pageHtml.slice(start + marker.length)
  const end = slice.indexOf(',"videoDetails"')
  if (end < 0) return null

  try {
    const captions = JSON.parse(slice.slice(0, end)) as {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: Array<{ baseUrl?: string; languageCode?: string }>
      }
    }
    const tracks = captions.playerCaptionsTracklistRenderer?.captionTracks ?? []
    if (!tracks.length) return null
    const preferred = tracks.find((track) => track.languageCode?.startsWith(preferredLang))
    const track = preferred ?? tracks[0]
    if (!track) return null
    return track.baseUrl ?? null
  } catch {
    return null
  }
}

function extractVideoTitle(pageHtml: string): string | undefined {
  const match = pageHtml.match(/<title>([^<]+)<\/title>/i)
  if (!match?.[1]) return undefined
  return match[1].replace(/\s+-\s+YouTube$/i, '').trim()
}

function extractChannelName(pageHtml: string): string | undefined {
  const match = pageHtml.match(/"ownerChannelName":"([^"]+)"/)
  return match?.[1]?.trim()
}

async function defaultTextFetcher(url: string): Promise<string> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string>('fetch_url_text', { url })
  }
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.text()
}

export async function fetchYouTubeTranscript(input: {
  urlOrId: string
  language?: string
  fetchText?: TextFetcher
}): Promise<YouTubeTranscriptResult> {
  const videoId = parseYouTubeVideoId(input.urlOrId)
  if (!videoId) throw new Error('Invalid YouTube URL or video ID')

  const fetchText = input.fetchText ?? defaultTextFetcher
  const language = input.language ?? 'en'
  const watchUrl = youTubeWatchUrl(videoId)
  const pageHtml = await fetchText(watchUrl)
  const captionUrl = extractCaptionTrackUrl(pageHtml, language)
  if (!captionUrl) {
    throw new Error(`No captions found for video ${videoId}. Try a video with subtitles enabled.`)
  }

  const captionXml = await fetchText(captionUrl)
  const segments = parseCaptionXml(captionXml)
  if (!segments.length) {
    throw new Error(`Caption track was empty for video ${videoId}`)
  }

  const plainText = segments.map((segment) => segment.text).join(' ')
  return {
    videoId,
    title: extractVideoTitle(pageHtml) ?? `YouTube ${videoId}`,
    channel: extractChannelName(pageHtml),
    language,
    segments,
    plainText,
  }
}

export function parseYouTubeUrlsFromText(text: string): string[] {
  const urls = new Set<string>()
  const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s]+|youtu\.be\/[^\s]+|youtube\.com\/shorts\/[^\s]+)/gi
  for (const match of text.matchAll(urlPattern)) {
    const videoId = parseYouTubeVideoId(match[0])
    if (videoId) urls.add(youTubeWatchUrl(videoId))
  }
  for (const line of text.split(/\r?\n/)) {
    const videoId = parseYouTubeVideoId(line.trim())
    if (videoId) urls.add(youTubeWatchUrl(videoId))
  }
  return [...urls]
}
