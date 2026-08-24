export interface GraphNode { id: string; label: string; type: string; properties: Record<string, unknown> }
export interface GraphEdge { from: string; to: string; relation: string; weight: number }

export class KnowledgeGraph {
  private nodes = new Map<string, GraphNode>()
  private edges: GraphEdge[] = []

  upsertNode(node: GraphNode): void { this.nodes.set(node.id, node) }
  connect(from: string, to: string, relation: string, weight = 1): void {
    if (!this.nodes.has(from) || !this.nodes.has(to)) throw new Error('Both graph nodes must exist before connecting them')
    const existing = this.edges.find((edge) => edge.from === from && edge.to === to && edge.relation === relation)
    if (existing) existing.weight = weight
    else this.edges.push({ from, to, relation, weight })
  }
  neighbors(id: string): Array<{ node: GraphNode; edge: GraphEdge }> {
    return this.edges.filter((edge) => edge.from === id || edge.to === id).map((edge) => {
      const other = edge.from === id ? edge.to : edge.from
      return { node: this.nodes.get(other)!, edge }
    }).filter((item) => Boolean(item.node))
  }
  snapshot() { return { nodes: [...this.nodes.values()], edges: [...this.edges] } }
}
