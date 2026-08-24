import type { CanonicalRecord } from '../domain/canonical-records'

export interface CanonicalStore {
  append(record: CanonicalRecord): Promise<void>
  get<T = unknown>(id: string): Promise<CanonicalRecord<T> | null>
  list(kind?: CanonicalRecord['kind']): Promise<readonly CanonicalRecord[]>
}

export class InMemoryCanonicalStore implements CanonicalStore {
  private readonly records = new Map<string, CanonicalRecord>()

  async append(record: CanonicalRecord): Promise<void> {
    if (this.records.has(record.id)) {
      throw new Error(`Duplicate canonical record id: ${record.id}`)
    }
    this.records.set(record.id, structuredClone(record))
  }

  async get<T = unknown>(id: string): Promise<CanonicalRecord<T> | null> {
    const record = this.records.get(id)
    return record ? structuredClone(record) as CanonicalRecord<T> : null
  }

  async list(kind?: CanonicalRecord['kind']): Promise<readonly CanonicalRecord[]> {
    const values = [...this.records.values()].filter((record) => !kind || record.kind === kind)
    return structuredClone(values)
  }
}
