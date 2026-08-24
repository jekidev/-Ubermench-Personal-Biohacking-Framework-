export interface SemanticMemoryItem {
  id: string
  title: string
  content: string
  source: string
  tags: string[]
  embedding?: number[]
  createdAt: string
  updatedAt: string
  confidence?: number
}

export interface SemanticMemoryResult extends SemanticMemoryItem { score: number }

function tokenize(text: string) {
  return text.toLowerCase().split(/[^a-z0-9_:-]+/).filter((token) => token.length > 1)
}

function lexicalSimilarity(a: string, b: string) {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))
  if (!left.size || !right.size) return 0
  let overlap = 0
  for (const token of left) if (right.has(token)) overlap += 1
  return overlap / Math.sqrt(left.size * right.size)
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return undefined
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] ** 2
    normB += b[i] ** 2
  }
  if (!normA || !normB) return 0
  return dot / Math.sqrt(normA * normB)
}

export class SemanticMemoryIndex {
  private readonly items = new Map<string, SemanticMemoryItem>()

  upsert(item: SemanticMemoryItem) {
    this.items.set(item.id, { ...item, updatedAt: new Date().toISOString() })
    return this.items.get(item.id) as SemanticMemoryItem
  }

  remove(id: string) { return this.items.delete(id) }
  all() { return [...this.items.values()] }

  search(query: string, embedding?: number[], limit = 10): SemanticMemoryResult[] {
    const results = this.all().map((item) => {
      const textScore = lexicalSimilarity(query, `${item.title} ${item.content} ${item.tags.join(' ')}`)
      const vectorScore = embedding && item.embedding ? cosineSimilarity(embedding, item.embedding) : undefined
      const score = vectorScore === undefined ? textScore : Math.max(0, 0.35 * textScore + 0.65 * vectorScore)
      return { ...item, score }
    })
    return results.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.max(1, limit))
  }
}
