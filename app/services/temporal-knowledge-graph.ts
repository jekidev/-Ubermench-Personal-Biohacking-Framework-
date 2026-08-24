import type { KnowledgeEdge, KnowledgeNode } from '~/services/knowledge-graph'

export interface TemporalEdge extends KnowledgeEdge {
  validFrom?: string
  validTo?: string
  observedAt: string
  provenance?: string
}

export interface GraphSearchOptions {
  asOf?: string
  minConfidence?: number
  relation?: string
}

export class TemporalKnowledgeGraph {
  readonly nodes = new Map<string, KnowledgeNode>()
  readonly edges: TemporalEdge[] = []

  addNode(node: KnowledgeNode) {
    this.nodes.set(node.id, node)
    return node
  }

  addEdge(edge: TemporalEdge) {
    if (edge.confidence < 0 || edge.confidence > 1) throw new RangeError('confidence must be between 0 and 1')
    const observedAt = new Date(edge.observedAt).toISOString()
    if (edge.validFrom && Number.isNaN(Date.parse(edge.validFrom))) throw new TypeError('validFrom must be a valid ISO date')
    if (edge.validTo && Number.isNaN(Date.parse(edge.validTo))) throw new TypeError('validTo must be a valid ISO date')
    this.edges.push({ ...edge, observedAt })
    return edge
  }

  related(id: string, options: GraphSearchOptions = {}) {
    const asOf = options.asOf ? Date.parse(options.asOf) : undefined
    const minConfidence = options.minConfidence ?? 0
    return this.edges
      .filter((edge) => edge.from === id || edge.to === id)
      .filter((edge) => edge.confidence >= minConfidence)
      .filter((edge) => !options.relation || edge.relation === options.relation)
      .filter((edge) => asOf === undefined || this.isActiveAt(edge, asOf))
      .map((edge) => edge.from === id ? edge.to : edge.from)
      .map((nodeId) => this.nodes.get(nodeId))
      .filter((node): node is KnowledgeNode => Boolean(node))
  }

  private isActiveAt(edge: TemporalEdge, timestamp: number) {
    const from = edge.validFrom ? Date.parse(edge.validFrom) : Number.NEGATIVE_INFINITY
    const to = edge.validTo ? Date.parse(edge.validTo) : Number.POSITIVE_INFINITY
    return timestamp >= from && timestamp <= to
  }
}
