export interface MemoryChunk {
  id: string
  title: string
  content: string
  source: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface MemorySearchResult extends MemoryChunk {
  score: number
}

function tokenize(value: string) {
  return new Set(value.toLowerCase().split(/[^a-z0-9_:-]+/).filter((token) => token.length > 1))
}

export class LocalMemoryIndex {
  private readonly chunks = new Map<string, MemoryChunk>()

  upsert(chunk: MemoryChunk) {
    this.chunks.set(chunk.id, { ...chunk, updatedAt: new Date().toISOString() })
    return this.chunks.get(chunk.id) as MemoryChunk
  }

  remove(id: string) {
    return this.chunks.delete(id)
  }

  all() {
    return [...this.chunks.values()]
  }

  search(query: string, limit = 10): MemorySearchResult[] {
    const terms = tokenize(query)
    if (!terms.size) return []
    return this.all().map((chunk) => {
      const haystack = tokenize(`${chunk.title} ${chunk.content} ${chunk.tags.join(' ')}`)
      const matches = [...terms].filter((term) => haystack.has(term)).length
      return { ...chunk, score: matches / terms.size }
    }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.max(1, limit))
  }
}
