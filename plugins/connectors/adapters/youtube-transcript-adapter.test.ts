import { describe, expect, it } from 'vitest'
import {
  fetchYouTubeTranscript,
  parseYouTubeUrlsFromText,
  parseYouTubeVideoId,
} from './youtube-transcript-adapter'

const SAMPLE_PAGE = `
<html><head><title>Longevity podcast ep 1 - YouTube</title></head><body>
<script>"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en","languageCode":"en"}]}},"videoDetails":{"title":"Longevity podcast ep 1"}}</script>
"ownerChannelName":"Biohacking Lab"
</body></html>
`

const SAMPLE_CAPTIONS = `
<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0.0">Welcome to the biohacking podcast.</text>
  <text start="5.2">Today we discuss NAD+ and sleep.</text>
</transcript>
`

describe('youtube-transcript-adapter', () => {
  it('parses common YouTube URL formats', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts transcript text from captions', async () => {
    const fetchText = async (url: string) => {
      if (url.includes('watch?v=')) return SAMPLE_PAGE
      if (url.includes('timedtext')) return SAMPLE_CAPTIONS
      throw new Error(`Unexpected URL: ${url}`)
    }

    const result = await fetchYouTubeTranscript({
      urlOrId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      fetchText,
    })

    expect(result.videoId).toBe('dQw4w9WgXcQ')
    expect(result.title).toBe('Longevity podcast ep 1')
    expect(result.channel).toBe('Biohacking Lab')
    expect(result.plainText).toContain('NAD+')
    expect(result.segments).toHaveLength(2)
  })

  it('parses URLs from multiline paste input', () => {
    const urls = parseYouTubeUrlsFromText(`
      https://www.youtube.com/watch?v=abc12345678
      https://youtu.be/xyz98765432
      not-a-url
    `)
    expect(urls).toEqual([
      'https://www.youtube.com/watch?v=abc12345678',
      'https://www.youtube.com/watch?v=xyz98765432',
    ])
  })
})
