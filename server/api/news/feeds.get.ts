import { fetchPublicNewsFeeds } from '~/services/news-feeds'

export default defineEventHandler(async () => {
  return await fetchPublicNewsFeeds()
})
