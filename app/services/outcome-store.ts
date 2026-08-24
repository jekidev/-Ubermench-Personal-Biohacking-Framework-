import type { OutcomeRecord } from './persistent-outcome-store'

export interface OutcomeStore {
  save(record: OutcomeRecord): Promise<void> | void
  get(id: string): Promise<OutcomeRecord | undefined> | OutcomeRecord | undefined
  list(): Promise<OutcomeRecord[]> | OutcomeRecord[]
  remove(id: string): Promise<boolean> | boolean
}

export class InMemoryOutcomeStore implements OutcomeStore {
  private readonly records = new Map<string, OutcomeRecord>()

  save(record: OutcomeRecord) { this.records.set(record.id, structuredClone(record)) }
  get(id: string) { const record = this.records.get(id); return record ? structuredClone(record) : undefined }
  list() { return [...this.records.values()].map((item) => structuredClone(item)) }
  remove(id: string) { return this.records.delete(id) }
}

let defaultStore: OutcomeStore = new InMemoryOutcomeStore()

export function configureOutcomeStore(store: OutcomeStore) {
  defaultStore = store
}

export function getOutcomeStore(): OutcomeStore {
  return defaultStore
}
