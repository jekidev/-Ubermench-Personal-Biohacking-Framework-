import { describe, expect, it, vi } from 'vitest'
import { createGitHubTools } from './github-tools'

vi.mock('../../secret-vault', () => ({
  getSecret: vi.fn(async (key: string) => {
    if (key === 'GITHUB_USERNAME') return 'jekidev'
    return undefined
  }),
}))

vi.mock('../../starchive-store', () => ({
  resolveActiveStarchiveCatalog: vi.fn(() => ({
    catalog: {
      username: 'jekidev',
      exportedAt: '2026-01-01T00:00:00Z',
      repos: [{
        fullName: 'mem0ai/mem0',
        description: 'Memory layer',
        htmlUrl: 'https://github.com/mem0ai/mem0',
        language: 'Python',
        stars: 1,
        forks: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        listed: false,
      }],
    },
    source: 'bundled',
  })),
  searchActiveStarchive: vi.fn(async () => ({
    total: 1,
    items: [{ fullName: 'mem0ai/mem0' }],
    username: 'jekidev',
    exportedAt: '2026-01-01T00:00:00Z',
    source: 'bundled',
  })),
  saveStarchiveCatalog: vi.fn(),
}))

vi.mock('../../../../plugins/connectors/connector-runtime', () => ({
  getConnectorStatus: vi.fn(async () => ({
    id: 'github',
    status: 'missing-credentials',
    enabled: false,
  })),
}))

vi.mock('../../../../plugins/connectors/connector-store', () => ({
  isConnectorEnabled: vi.fn(() => false),
}))

vi.mock('../../../../plugins/llm/mcp/install-store', () => ({
  getInstalledMcpServer: vi.fn(() => undefined),
}))

describe('github tools', () => {
  it('registers starchive and status tools', () => {
    const tools = createGitHubTools()
    const names = tools.map((tool) => tool.name)
    expect(names).toEqual(expect.arrayContaining([
      'github.status',
      'github.starchive.search',
      'github.starchive.refresh',
      'github.starchive.get',
    ]))
    expect(tools.find((tool) => tool.name === 'github.starchive.refresh')?.requiresApproval).toBe(true)
  })

  it('searches the local archive', async () => {
    const tools = createGitHubTools()
    const search = tools.find((tool) => tool.name === 'github.starchive.search')!
    await expect(search.execute({ query: 'mem0' })).resolves.toMatchObject({ total: 1 })
  })

  it('fails refresh without token', async () => {
    const tools = createGitHubTools()
    const refresh = tools.find((tool) => tool.name === 'github.starchive.refresh')!
    await expect(refresh.execute({})).rejects.toThrow(/GITHUB_PERSONAL_ACCESS_TOKEN/)
  })
})
