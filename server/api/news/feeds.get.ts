import { fetchPublicNewsFeeds } from '~/services/news-feeds'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=180')
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  return await fetchPublicNewsFeeds()
})
