import { describe, expect, it } from 'vitest'
import {
  assignListMembership,
  buildStarredRepoListsCsv,
  buildStarredReposCsv,
  createStarchiveClient,
  mapGithubStarredRepo,
  parseGithubLinkNext,
  parseListReposHtml,
  parseStarListsHtml,
} from './starchive'

const sampleRepo = {
  fullName: 'jekidev/example',
  description: 'A repo, with "quotes"',
  htmlUrl: 'https://github.com/jekidev/example',
  language: 'TypeScript',
  stars: 12,
  forks: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  listed: false,
}

describe('starchive', () => {
  it('rejects missing credentials', () => {
    expect(() => createStarchiveClient({ username: ' ', token: 'token' })).toThrow('GitHub username is required')
    expect(() => createStarchiveClient({ username: 'jekidev', token: '' })).toThrow('GitHub token is required')
  })

  it('parses GitHub pagination links', () => {
    const next = parseGithubLinkNext('<https://api.github.com/user/starred?page=2>; rel="next", <https://api.github.com/user/starred?page=4>; rel="last"')
    expect(next).toBe('https://api.github.com/user/starred?page=2')
    expect(parseGithubLinkNext(null)).toBeNull()
  })

  it('parses starred lists with the upstream HTML markers', () => {
    const html = `
      <a href="/stars/jekidev/lists/longevity">ignored</a>
      <h3 class="f4 text-bold no-wrap mr-3">Longevity</h3>
      <a href="/stars/jekidev/lists/agents">ignored</a>
      <h3 class="f4 text-bold no-wrap mr-3">Agents</h3>
    `
    expect(parseStarListsHtml(html, 'jekidev')).toEqual([
      { slug: 'longevity', name: 'Longevity' },
      { slug: 'agents', name: 'Agents' },
    ])
  })

  it('parses repositories from a starred list page', () => {
    const html = `
      <h3>
        <a href="/jekidev/example">
          <span class="text-normal">jekidev / </span>example
        </a>
      </h3>
    `
    expect(parseListReposHtml(html)).toEqual([{ owner: 'jekidev', repo: 'example' }])
  })

  it('maps and validates starred repository payloads', () => {
    const repo = mapGithubStarredRepo({
      full_name: 'jekidev/example',
      description: null,
      html_url: 'https://github.com/jekidev/example',
      language: 'TypeScript',
      stargazers_count: 4,
      forks_count: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    })
    expect(repo.fullName).toBe('jekidev/example')
    expect(repo.description).toBe('')
    expect(repo.stars).toBe(4)
    expect(() => mapGithubStarredRepo({})).toThrow('missing full_name')
  })

  it('marks list membership and exports STARCHIVE CSV columns', () => {
    const lists = [{ slug: 'longevity', name: 'Longevity', repos: [{ owner: 'jekidev', repo: 'example' }] }]
    const repos = assignListMembership([
      sampleRepo,
      { ...sampleRepo, fullName: 'jekidev/other', htmlUrl: 'https://github.com/jekidev/other', description: 'Other' },
    ], lists)

    expect(repos[0]?.listed).toBe(true)
    expect(repos[1]?.listed).toBe(false)

    const repoCsv = buildStarredReposCsv(repos)
    expect(repoCsv).toContain('full_name,description,html_url,language,stargazers_count,forks_count,created_at,updated_at')
    expect(repoCsv).toContain('"A repo, with ""quotes"""')

    const listCsv = buildStarredRepoListsCsv({ username: 'jekidev', repos, lists })
    expect(listCsv).toContain('repo_full_name,repo_url,description,stars,list_name')
    expect(listCsv).toContain('Longevity')
    expect(listCsv).toContain('Uncategorised')
  })

  it('assigns every repo to All Starred when no lists exist', () => {
    const csv = buildStarredRepoListsCsv({ username: 'jekidev', repos: [sampleRepo], lists: [] })
    expect(csv).toContain('All Starred')
    expect(csv).not.toContain('Uncategorised')
  })

  it('fetches starred repos, follows pagination, and tolerates list HTML failures', async () => {
    const responses = [
      {
        url: 'https://api.github.com/users/jekidev/starred?per_page=100',
        body: [{
          full_name: 'jekidev/example',
          description: 'One',
          html_url: 'https://github.com/jekidev/example',
          language: 'TypeScript',
          stargazers_count: 2,
          forks_count: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        }],
        headers: { link: '<https://api.github.com/users/jekidev/starred?page=2>; rel="next"' },
      },
      {
        url: 'https://api.github.com/users/jekidev/starred?page=2',
        body: [{
          full_name: 'jekidev/second',
          description: 'Two',
          html_url: 'https://github.com/jekidev/second',
          language: 'Go',
          stargazers_count: 5,
          forks_count: 1,
          created_at: '2026-01-03T00:00:00Z',
          updated_at: '2026-01-04T00:00:00Z',
        }],
        headers: {},
      },
    ] as const

    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      const match = responses.find((item) => item.url === url)
      if (!match) {
        return new Response('blocked', { status: 418, headers: { 'content-type': 'text/plain' } })
      }
      return new Response(JSON.stringify(match.body), {
        status: 200,
        headers: { 'content-type': 'application/json', ...match.headers },
      })
    }

    const client = createStarchiveClient({ username: 'jekidev', token: 'test-token', fetchImpl })
    const catalog = await client.fetchCatalog()
    expect(catalog.repos).toHaveLength(2)
    expect(catalog.lists).toEqual([])
    expect(catalog.repos[1]?.fullName).toBe('jekidev/second')
  })

  it('surfaces authentication failures from the GitHub API', async () => {
    const fetchImpl: typeof fetch = async () => new Response('nope', { status: 401 })
    const client = createStarchiveClient({ username: 'jekidev', token: 'bad', fetchImpl })
    await expect(client.fetchCatalog()).rejects.toThrow('GitHub authentication failed')
  })
})
