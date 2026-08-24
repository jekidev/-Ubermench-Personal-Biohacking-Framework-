import { describe, expect, it } from 'vitest'
import { parseDRKG } from './drkg-importer'
import { LocalMemoryIndex } from './local-memory'

describe('graph and memory integrations', () => {
  it('imports DRKG-style triples with typed nodes and provenance', () => {
    const result = parseDRKG('Gene::G1\trelates_to\tCompound::C1\nCompound::C1\trelates_to\tDisease::D1')
    expect(result.nodes).toBe(3)
    expect(result.edges).toBe(2)
    expect(result.graph.nodes.get('Gene::G1')?.type).toBe('gene')
    expect(result.graph.edges[0]?.provenance).toBe('DRKG')
  })

  it('ranks local memory by token overlap', () => {
    const index = new LocalMemoryIndex()
    index.upsert({ id: '1', title: 'CRP trend', content: 'CRP inflammation improved', source: 'lab', tags: ['inflammation'], createdAt: '2026-01-01', updatedAt: '2026-01-01' })
    index.upsert({ id: '2', title: 'Sleep', content: 'HRV and sleep duration', source: 'wearable', tags: ['sleep'], createdAt: '2026-01-01', updatedAt: '2026-01-01' })
    expect(index.search('CRP inflammation')[0]?.id).toBe('1')
  })
})
