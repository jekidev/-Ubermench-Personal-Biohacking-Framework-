import { loadPersistedAgentMemories } from '../../../app/services/agent-memory-persistence'
import type { MemoryRecord } from '../../../app/services/agent-superstack/types'
import { SemanticMemoryIndex, type SemanticMemoryItem, type SemanticMemoryResult } from '../../../app/services/semantic-memory'

function memoryRecordToItem(record: MemoryRecord): SemanticMemoryItem {
  return {
    id: record.id,
    title: `${record.type}: ${record.text.slice(0, 80)}`,
    content: record.text,
    source: `agent-memory:${record.type}`,
    tags: [...record.tags, record.type, 'agent-memory'],
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
    confidence: Math.min(1, 0.5 + record.importance * 0.5),
  }
}

export class AgentMemoryRagIndex {
  private readonly memory = new SemanticMemoryIndex()
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | undefined

  constructor(storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    this.storage = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
    for (const record of loadPersistedAgentMemories(this.storage)) {
      this.memory.upsert(memoryRecordToItem(record))
    }
  }

  search(query: string, limit = 8): SemanticMemoryResult[] {
    return this.memory.search(query, undefined, limit)
  }

  allRecords(): MemoryRecord[] {
    return loadPersistedAgentMemories(this.storage)
  }

  count(): number {
    return this.allRecords().length
  }
}

export function searchAgentMemories(
  query: string,
  limit = 8,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): SemanticMemoryResult[] {
  return new AgentMemoryRagIndex(storage).search(query, limit)
}
