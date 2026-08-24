import { describe, expect, it } from 'vitest'
import { TemporalKnowledgeGraph } from './temporal-knowledge-graph'

describe('temporal knowledge graph', () => {
  it('rejects invalid temporal ranges and dates', () => {
    const graph = new TemporalKnowledgeGraph()
    expect(() => graph.addEdge({ from: 'a', relation: 'relates_to', to: 'b', confidence: 0.5, observedAt: 'not-a-date' })).toThrow(TypeError)
    expect(() => graph.addEdge({ from: 'a', relation: 'relates_to', to: 'b', confidence: 0.5, observedAt: '2026-01-01', validFrom: '2026-02-01', validTo: '2026-01-01' })).toThrow(RangeError)
  })

  it('rejects invalid asOf and confidence filters', () => {
    const graph = new TemporalKnowledgeGraph()
    graph.addNode({ id: 'a', type: 'gene' })
    graph.addNode({ id: 'b', type: 'protein' })
    graph.addEdge({ from: 'a', relation: 'encodes', to: 'b', confidence: 0.8, observedAt: '2026-01-01', validFrom: '2026-01-01' })
    expect(() => graph.related('a', { asOf: 'bad-date' })).toThrow(TypeError)
    expect(() => graph.related('a', { minConfidence: Number.NaN })).toThrow(RangeError)
  })
})
