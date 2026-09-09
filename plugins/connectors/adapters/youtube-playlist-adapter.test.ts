import { describe, expect, it } from 'vitest'
import { listPlaylistVideoUrls, parsePlaylistId } from './youtube-playlist-adapter'

const SAMPLE_PLAYLIST_HTML = `
<html><body>
<script>{"videoId":"abc12345678","title":"Episode 1"}</script>
<script>{"videoId":"xyz98765432","title":"Episode 2"}</script>
</body></html>
`

describe('youtube-playlist-adapter', () => {
  it('parses playlist id from url', () => {
    expect(parsePlaylistId('https://www.youtube.com/playlist?list=PL123abc')).toBe('PL123abc')
  })

  it('extracts video urls from playlist html', async () => {
    const urls = await listPlaylistVideoUrls({
      playlistUrlOrId: 'PL123abc',
      maxVideos: 5,
      fetchText: async () => SAMPLE_PLAYLIST_HTML,
    })
    expect(urls).toEqual([
      'https://www.youtube.com/watch?v=abc12345678',
      'https://www.youtube.com/watch?v=xyz98765432',
    ])
  })
})
