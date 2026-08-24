import type { OutcomeRecord, OutcomePersistenceAdapter } from './persistent-outcome-store'
import { memoryOutcomePersistenceAdapter } from './persistent-outcome-store'

export type { OutcomeRecord, OutcomePersistenceAdapter }

export interface OutcomeStore extends OutcomePersistenceAdapter {}

export class InMemoryOutcomeStore implements OutcomeStore {
  private readonly adapter: OutcomePersistenceAdapter

  constructor(adapter: OutcomePersistenceAdapter = memoryOutcomePersistenceAdapter) {
    this.adapter = adapter
  }

  save(record: OutcomeRecord) { return this.adapter.save(record) }
  get(id: string) { return this.adapter.get(id) }
  list() { return this.adapter.list() }
  remove(id: string) { return this.adapter.remove(id) }
}

let defaultStore: OutcomeStore = new InMemoryOutcomeStore()

export function configureOutcomeStore(store: OutcomeStore) {
  defaultStore = store
}

export function getOutcomeStore(): OutcomeStore {
  return defaultStore
}
