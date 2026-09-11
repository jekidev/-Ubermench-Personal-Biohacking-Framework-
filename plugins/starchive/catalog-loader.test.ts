import { describe, expect, it } from 'vitest'
import { buildStarchiveCatalog, searchStarchiveCatalog } from './catalog-loader'
import type { StarchiveRepo } from './types'

const sampleRepos: StarchiveRepo[] = [
  {
    fullName: 'mem0ai/mem0',
    description: 'Memory layer for AI',
    htmlUrl: 'https://github.com/mem0ai/mem0',
    language: 'Python',
    stars: 1000,
    forks: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    listed: false,
  },
  {
    fullName: 'jekidev/stararchive',
    description: 'Starred repo archive',
    htmlUrl: 'https://github.com/jekidev/stararchive',
    language: 'TypeScript',
    stars: 5,
    forks: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    listed: false,
  },
]

describe('starchive catalog loader', () => {
  it('searches by query and language', () => {
    const catalog = buildStarchiveCatalog('jekidev', sampleRepos)
    const byQuery = searchStarchiveCatalog(catalog, { query: 'memory' })
    expect(byQuery.total).toBe(1)
    expect(byQuery.items[0]?.fullName).toBe('mem0ai/mem0')

    const byLanguage = searchStarchiveCatalog(catalog, { language: 'TypeScript' })
    expect(byLanguage.total).toBe(1)
    expect(byLanguage.items[0]?.fullName).toBe('jekidev/stararchive')
  })

  it('paginates results', () => {
    const catalog = buildStarchiveCatalog('jekidev', sampleRepos)
    const page = searchStarchiveCatalog(catalog, { limit: 1, offset: 1 })
    expect(page.total).toBe(2)
    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.fullName).toBe('jekidev/stararchive')
  })
})
