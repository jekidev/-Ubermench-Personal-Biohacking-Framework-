export interface KnowledgeNode { id: string; type: 'gene' | 'protein' | 'compound' | 'biomarker' | 'phenotype' | 'pathway' | 'disease' | 'intervention' }
export interface KnowledgeEdge { from: string; relation: string; to: string; confidence: number; source?: string }

export class KnowledgeGraph {
  readonly nodes = new Map<string, KnowledgeNode>()
  readonly edges: KnowledgeEdge[] = []

  addNode(node: KnowledgeNode) { this.nodes.set(node.id, node); return node }
  addEdge(edge: KnowledgeEdge) {
    if (!Number.isFinite(edge.confidence) || edge.confidence < 0 || edge.confidence > 1) throw new RangeError('confidence must be a finite number between 0 and 1')
    this.edges.push(edge)
    return edge
  }
  neighbors(id: string) { return this.edges.filter((edge) => edge.from === id || edge.to === id) }
  related(id: string) { return this.neighbors(id).map((edge) => edge.from === id ? edge.to : edge.from).map((nodeId) => this.nodes.get(nodeId)).filter((node): node is KnowledgeNode => Boolean(node)) }
}
