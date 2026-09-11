import { buildStarchiveCatalog, normalizeGithubStarredRepo } from './catalog-loader'
import type { StarchiveCatalog } from './types'

function parseNextLink(link: string | null): string | null {
  const match = link?.match(/<([^>]+)>\s*;\s*rel="next"/i)
  return match?.[1] ?? null
}

export async function fetchStarredReposFromGithub(
  username: string,
  token?: string,
): Promise<StarchiveCatalog> {
  const repos = []
  let url: string | null = `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=100`

  while (url) {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Ubermench-STARCHIVE',
    }
    if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`

    const response = await fetch(url, { headers })
    if (response.status === 401 || response.status === 403) {
      throw new Error('GitHub authentication failed. Check the personal access token and repo scope.')
    }
    if (!response.ok) {
      throw new Error(`GitHub request failed (${response.status})`)
    }

    const payload = await response.json()
    if (!Array.isArray(payload)) throw new Error('GitHub starred response must be an array')
    for (const repo of payload) {
      repos.push(normalizeGithubStarredRepo(repo))
    }
    url = parseNextLink(response.headers.get('link'))
  }

  return buildStarchiveCatalog(username, repos)
}
