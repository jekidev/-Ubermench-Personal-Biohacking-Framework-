import type { StarchiveCatalog, StarchiveRepo, StarchiveSearchOptions, StarchiveSearchResult } from './types'

export const DEFAULT_GITHUB_USERNAME = 'jekidev'

export function searchStarchiveCatalog(
  catalog: StarchiveCatalog,
  options: StarchiveSearchOptions = {},
): StarchiveSearchResult {
  const query = options.query?.trim().toLowerCase() ?? ''
  const language = options.language?.trim().toLowerCase() ?? ''
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)

  let filtered = catalog.repos
  if (query) {
    filtered = filtered.filter((repo) => {
      const haystack = `${repo.fullName} ${repo.description}`.toLowerCase()
      return haystack.includes(query)
    })
  }
  if (language) {
    filtered = filtered.filter((repo) => (repo.language ?? '').toLowerCase() === language)
  }

  const items = filtered.slice(offset, offset + limit)
  return {
    total: filtered.length,
    items,
    username: catalog.username,
    exportedAt: catalog.exportedAt,
    source: 'bundled',
  }
}

export function summarizeStarchiveCatalog(catalog: StarchiveCatalog): {
  username: string
  exportedAt: string
  repoCount: number
  topLanguages: Array<{ language: string; count: number }>
} {
  const counts = new Map<string, number>()
  for (const repo of catalog.repos) {
    const language = repo.language?.trim()
    if (!language) continue
    counts.set(language, (counts.get(language) ?? 0) + 1)
  }
  const topLanguages = [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    username: catalog.username,
    exportedAt: catalog.exportedAt,
    repoCount: catalog.repos.length,
    topLanguages,
  }
}

export function normalizeGithubStarredRepo(repo: {
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  created_at: string
  updated_at: string
}): StarchiveRepo {
  return {
    fullName: repo.full_name,
    description: (repo.description ?? '').replace(/\s+/g, ' ').trim(),
    htmlUrl: repo.html_url,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    listed: false,
  }
}

export function buildStarchiveCatalog(username: string, repos: StarchiveRepo[]): StarchiveCatalog {
  return {
    username,
    exportedAt: new Date().toISOString(),
    repos,
    lists: [],
  }
}
