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
    if (!Number.isFinite(edge.confidence) || edge.confidence < 0 || edge.confidence > 1) throw new RangeError('confidence must be a finite number between 0 and 1')
    const observedAtMs = Date.parse(edge.observedAt)
    if (!Number.isFinite(observedAtMs)) throw new TypeError('observedAt must be a valid ISO date')
    if (edge.validFrom && !Number.isFinite(Date.parse(edge.validFrom))) throw new TypeError('validFrom must be a valid ISO date')
    if (edge.validTo && !Number.isFinite(Date.parse(edge.validTo))) throw new TypeError('validTo must be a valid ISO date')
    if (edge.validFrom && edge.validTo && Date.parse(edge.validFrom) > Date.parse(edge.validTo)) throw new RangeError('validFrom must be before or equal to validTo')
    const observedAt = new Date(observedAtMs).toISOString()
    this.edges.push({ ...edge, observedAt })
    return edge
  }

  related(id: string, options: GraphSearchOptions = {}) {
    const asOf = options.asOf === undefined ? undefined : Date.parse(options.asOf)
    if (asOf !== undefined && !Number.isFinite(asOf)) throw new TypeError('asOf must be a valid ISO date')
    const minConfidence = options.minConfidence ?? 0
    if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) throw new RangeError('minConfidence must be between 0 and 1')
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
