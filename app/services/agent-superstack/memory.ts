import type { MemoryRecord } from './types'

export class AgentMemory {
  private records: MemoryRecord[] = []

  add(input: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): MemoryRecord {
    const now = Date.now()
    const record: MemoryRecord = { ...input, id: `mem_${now}_${Math.random().toString(36).slice(2, 8)}`, createdAt: now, updatedAt: now, accessCount: 0 }
    this.records.unshift(record)
    return record
  }

  search(query: string, limit = 8): MemoryRecord[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    return this.records
      .map((record) => {
        const haystack = `${record.text} ${record.tags.join(' ')}`.toLowerCase()
        const matches = terms.reduce((n, term) => n + (haystack.includes(term) ? 1 : 0), 0)
        return { record, score: matches + record.importance * 0.15 + record.accessCount * 0.01 }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ record }) => { record.accessCount++; return record })
  }

  all(): MemoryRecord[] { return [...this.records] }
  clear(): void { this.records = [] }
  hydrate(records: MemoryRecord[]): void { this.records = [...records] }
}
