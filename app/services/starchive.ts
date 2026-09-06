export const STARCHIVE_UPSTREAM = 'https://github.com/jwardsmith/STARCHIVE' as const
export const STARCHIVE_GITHUB_API_VERSION = '2022-11-28' as const
export const DEFAULT_STARCHIVE_USERNAME = 'jekidev' as const

export type StarredRepo = {
  fullName: string
  description: string
  htmlUrl: string
  language: string | null
  stars: number
  forks: number
  createdAt: string
  updatedAt: string
  listed: boolean
}

export type StarredList = {
  slug: string
  name: string
  repos: Array<{ owner: string; repo: string }>
}

export type StarchiveCatalog = {
  username: string
  repos: StarredRepo[]
  lists: StarredList[]
  exportedAt?: string
}

export type StarchiveClientOptions = {
  username: string
  token?: string
  fetchImpl?: typeof fetch
}

export type StarchiveClient = {
  username: string
  fetchCatalog: () => Promise<StarchiveCatalog>
}

const LIST_LINK_CLASS = 'f4 text-bold no-wrap mr-3'

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required`)
  return trimmed
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function csvField(value: string | number | null): string {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function sanitizeDescription(description: string): string {
  return description.replace(/\n/g, ' ').replace(/\t/g, ' ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function parseGithubLinkNext(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/<([^>]+)>\s*;\s*rel="next"/i)
  return match?.[1] ?? null
}

export function parseStarListsHtml(html: string, username: string): Array<{ slug: string; name: string }> {
  if (typeof html !== 'string') throw new Error('Star-list HTML must be a string')
  const safeUsername = requireNonEmpty(username, 'GitHub username')
  const pattern = new RegExp(
    `href="/stars/${escapeRegex(safeUsername)}/lists/(\\S+)".*?<h3 class="${LIST_LINK_CLASS}">(.*?)</h3>`,
    'gs',
  )
  const lists: Array<{ slug: string; name: string }> = []
  for (const match of html.matchAll(pattern)) {
    const slug = match[1]
    const name = match[2]
    if (!slug || !name) continue
    lists.push({ slug, name: name.trim() })
  }
  return lists
}

export function parseListReposHtml(html: string): Array<{ owner: string; repo: string }> {
  if (typeof html !== 'string') throw new Error('List-repo HTML must be a string')
  const pattern = /<h3>\s*<a href="[^"]*">\s*<span class="text-normal">(\S+) \/ <\/span>(\S+)\s*<\/a>\s*<\/h3>/g
  const repos: Array<{ owner: string; repo: string }> = []
  for (const match of html.matchAll(pattern)) {
    const owner = match[1]
    const repo = match[2]
    if (!owner || !repo) continue
    repos.push({ owner, repo })
  }
  return repos
}

export function mapGithubStarredRepo(payload: unknown): StarredRepo {
  if (!isRecord(payload)) throw new Error('Starred repository payload must be an object')
  const fullName = readString(payload.full_name).trim()
  const htmlUrl = readString(payload.html_url).trim()
  if (!fullName) throw new Error('Starred repository is missing full_name')
  if (!htmlUrl) throw new Error('Starred repository is missing html_url')
  return {
    fullName,
    description: readString(payload.description),
    htmlUrl,
    language: typeof payload.language === 'string' ? payload.language : null,
    stars: readNumber(payload.stargazers_count),
    forks: readNumber(payload.forks_count),
    createdAt: readString(payload.created_at),
    updatedAt: readString(payload.updated_at),
    listed: false,
  }
}

export function assignListMembership(repos: readonly StarredRepo[], lists: readonly StarredList[]): StarredRepo[] {
  if (!Array.isArray(repos)) throw new Error('repos must be an array')
  if (!Array.isArray(lists)) throw new Error('lists must be an array')
  const listed = new Set<string>()
  for (const list of lists) {
    for (const item of list.repos) {
      listed.add(`${item.owner}/${item.repo}`)
    }
  }
  return repos.map((repo) => ({ ...repo, listed: listed.has(repo.fullName) }))
}

export function buildStarredReposCsv(repos: readonly StarredRepo[]): string {
  if (!Array.isArray(repos)) throw new Error('repos must be an array')
  const header = [
    'full_name',
    'description',
    'html_url',
    'language',
    'stargazers_count',
    'forks_count',
    'created_at',
    'updated_at',
  ]
  const rows = repos.map((repo) => [
    csvField(repo.fullName),
    csvField(sanitizeDescription(repo.description)),
    csvField(repo.htmlUrl),
    csvField(repo.language),
    csvField(repo.stars),
    csvField(repo.forks),
    csvField(repo.createdAt),
    csvField(repo.updatedAt),
  ].join(','))
  return [header.join(','), ...rows].join('\n') + '\n'
}

export function buildStarredRepoListsCsv(catalog: StarchiveCatalog): string {
  if (!isRecord(catalog) || !Array.isArray(catalog.repos) || !Array.isArray(catalog.lists)) {
    throw new Error('catalog must include repos and lists arrays')
  }
  const header = ['repo_full_name', 'repo_url', 'description', 'stars', 'list_name']
  const rows: string[] = []
  const byName = new Map(catalog.repos.map((repo) => [repo.fullName, repo]))
  const lists = catalog.lists.length > 0
    ? catalog.lists
    : [{ slug: 'all_starred', name: 'All Starred', repos: catalog.repos.map((repo) => {
        const [owner, name] = repo.fullName.split('/')
        return { owner: owner ?? '', repo: name ?? '' }
      }) }]

  const listed = new Set<string>()
  for (const list of lists) {
    for (const item of list.repos) {
      const fullName = `${item.owner}/${item.repo}`
      const repo = byName.get(fullName)
      if (!repo) continue
      listed.add(fullName)
      rows.push([
        csvField(fullName),
        csvField(repo.htmlUrl),
        csvField(sanitizeDescription(repo.description)),
        csvField(repo.stars),
        csvField(list.name),
      ].join(','))
    }
  }

  for (const repo of catalog.repos) {
    if (listed.has(repo.fullName)) continue
    rows.push([
      csvField(repo.fullName),
      csvField(repo.htmlUrl),
      csvField(sanitizeDescription(repo.description)),
      csvField(repo.stars),
      csvField('Uncategorised'),
    ].join(','))
  }

  return [header.join(','), ...rows].join('\n') + '\n'
}

function requestHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': STARCHIVE_GITHUB_API_VERSION,
    'User-Agent': 'Ubermench-STARCHIVE',
  }
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`
  return headers
}

export function parseStarchiveSnapshot(payload: unknown): StarchiveCatalog {
  if (!isRecord(payload) || !Array.isArray(payload.repos) || !Array.isArray(payload.lists)) {
    throw new Error('STARCHIVE snapshot must include repos and lists arrays')
  }
  const username = readString(payload.username).trim()
  if (!username) throw new Error('STARCHIVE snapshot is missing username')
  return {
    username,
    repos: payload.repos.map((repo) => {
      if (!isRecord(repo)) throw new Error('STARCHIVE snapshot repo must be an object')
      return {
        fullName: requireNonEmpty(readString(repo.fullName), 'repo.fullName'),
        description: readString(repo.description),
        htmlUrl: requireNonEmpty(readString(repo.htmlUrl), 'repo.htmlUrl'),
        language: typeof repo.language === 'string' ? repo.language : null,
        stars: readNumber(repo.stars),
        forks: readNumber(repo.forks),
        createdAt: readString(repo.createdAt),
        updatedAt: readString(repo.updatedAt),
        listed: repo.listed === true,
      }
    }),
    lists: payload.lists.map((list) => {
      if (!isRecord(list)) throw new Error('STARCHIVE snapshot list must be an object')
      return {
        slug: requireNonEmpty(readString(list.slug), 'list.slug'),
        name: requireNonEmpty(readString(list.name), 'list.name'),
        repos: Array.isArray(list.repos)
          ? list.repos.map((item) => {
              if (!isRecord(item)) throw new Error('STARCHIVE snapshot list repo must be an object')
              return {
                owner: requireNonEmpty(readString(item.owner), 'list.repo.owner'),
                repo: requireNonEmpty(readString(item.repo), 'list.repo.repo'),
              }
            })
          : [],
      }
    }),
    exportedAt: readString(payload.exportedAt) || undefined,
  }
}

export function serializeStarchiveSnapshot(catalog: StarchiveCatalog, exportedAt = new Date().toISOString()): string {
  return `${JSON.stringify({ ...catalog, exportedAt }, null, 2)}\n`
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>
}

export function createStarchiveClient(options: StarchiveClientOptions): StarchiveClient {
  const username = requireNonEmpty(options.username, 'GitHub username')
  const token = options.token?.trim() || undefined
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') throw new Error('fetch is not available')

  async function request(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetchImpl(url, init)
    if (response.status === 401 || response.status === 403) {
      throw new Error('GitHub authentication failed. Check the token and public_repo scope.')
    }
    if (!response.ok) {
      throw new Error(`GitHub request failed (${response.status}) for ${url}`)
    }
    return response
  }

  async function fetchStarredRepos(): Promise<StarredRepo[]> {
    const repos: StarredRepo[] = []
    let url: string | null = `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=100`
    while (url) {
      const response = await request(url, { headers: requestHeaders(token) })
      const payload = await readJson(response)
      if (!Array.isArray(payload)) throw new Error('GitHub starred response must be an array')
      for (const item of payload) repos.push(mapGithubStarredRepo(item))
      url = parseGithubLinkNext(response.headers.get('link'))
    }
    return repos
  }

  async function fetchListRepos(slug: string): Promise<Array<{ owner: string; repo: string }>> {
    const repos: Array<{ owner: string; repo: string }> = []
    for (let page = 1; page < 50; page += 1) {
      const url = `https://github.com/stars/${encodeURIComponent(username)}/lists/${encodeURIComponent(slug)}?page=${page}`
      const response = await fetchImpl(url, { headers: { 'User-Agent': 'Ubermench-STARCHIVE' } })
      if (!response.ok) break
      const html = await response.text()
      const pageRepos = parseListReposHtml(html)
      if (pageRepos.length === 0) break
      repos.push(...pageRepos)
    }
    return repos
  }

  async function fetchLists(): Promise<StarredList[]> {
    const url = `https://github.com/${encodeURIComponent(username)}?tab=stars`
    try {
      const response = await fetchImpl(url, { headers: { 'User-Agent': 'Ubermench-STARCHIVE' } })
      if (!response.ok) return []
      const html = await response.text()
      const parsed = parseStarListsHtml(html, username)
      const lists: StarredList[] = []
      for (const item of parsed) {
        lists.push({
          slug: item.slug,
          name: item.name,
          repos: await fetchListRepos(item.slug),
        })
      }
      return lists
    } catch {
      return []
    }
  }

  return {
    username,
    async fetchCatalog() {
      const repos = await fetchStarredRepos()
      const lists = await fetchLists()
      return {
        username,
        repos: assignListMembership(repos, lists),
        lists,
        exportedAt: new Date().toISOString(),
      }
    },
  }
}
