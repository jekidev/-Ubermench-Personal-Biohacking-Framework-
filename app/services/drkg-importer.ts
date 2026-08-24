import type { KnowledgeEdge, KnowledgeNode } from '~/services/knowledge-graph'
import { TemporalKnowledgeGraph } from './temporal-knowledge-graph'

export interface DRKGImportResult {
  nodes: number
  edges: number
  skipped: number
  graph: TemporalKnowledgeGraph
}

function classifyEntity(id: string): KnowledgeNode['type'] {
  const [type] = id.split('::', 1)
  const normalized = type?.toLowerCase()
  if (normalized === 'gene') return 'gene'
  if (normalized === 'compound') return 'compound'
  if (normalized === 'disease') return 'disease'
  if (normalized === 'biological_process' || normalized === 'pathway') return 'pathway'
  if (normalized === 'symptom' || normalized === 'side_effect') return 'phenotype'
  if (normalized === 'protein') return 'protein'
  return 'phenotype'
}

export function parseDRKG(text: string, observedAt = new Date().toISOString()): DRKGImportResult {
  const graph = new TemporalKnowledgeGraph()
  let skipped = 0
  const nodeIds = new Set<string>()

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue
    const parts = line.split('\t')
    if (parts.length < 3) { skipped += 1; continue }
    const [subject, relation, object] = parts.map((part) => part.trim())
    if (!subject || !relation || !object) { skipped += 1; continue }

    if (!nodeIds.has(subject)) {
      graph.addNode({ id: subject, type: classifyEntity(subject) })
      nodeIds.add(subject)
    }
    if (!nodeIds.has(object)) {
      graph.addNode({ id: object, type: classifyEntity(object) })
      nodeIds.add(object)
    }

    const edge: KnowledgeEdge = { from: subject, relation, to: object, confidence: 1, source: 'DRKG' }
    graph.addEdge({ ...edge, observedAt, provenance: 'DRKG' })
  }

  return { nodes: nodeIds.size, edges: graph.edges.length, skipped, graph }
}
