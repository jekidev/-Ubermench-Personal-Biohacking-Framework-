import type { CausalEstimate } from './causal-engine'

export interface OutcomeRecord {
  id: string
  intervention: string
  metric: string
  observed: number[]
  baseline: number[]
  estimate?: CausalEstimate
  createdAt: string
}

export interface OutcomePersistenceAdapter {
  save(record: OutcomeRecord): Promise<void> | void
  get(id: string): Promise<OutcomeRecord | undefined> | OutcomeRecord | undefined
  list(): Promise<OutcomeRecord[]> | OutcomeRecord[]
  remove(id: string): Promise<boolean> | boolean
}

const memoryStore = new Map<string, OutcomeRecord>()

export const memoryOutcomePersistenceAdapter: OutcomePersistenceAdapter = {
  save(record) { memoryStore.set(record.id, structuredClone(record)) },
  get(id) { const value = memoryStore.get(id); return value ? structuredClone(value) : undefined },
  list() { return [...memoryStore.values()].map((item) => structuredClone(item)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) },
  remove(id) { return memoryStore.delete(id) },
}

let adapter: OutcomePersistenceAdapter = memoryOutcomePersistenceAdapter

export function configureOutcomePersistence(next: OutcomePersistenceAdapter) {
  adapter = next
}

export function getOutcomePersistence(): OutcomePersistenceAdapter {
  return adapter
}

export async function saveOutcome(record: OutcomeRecord): Promise<OutcomeRecord> {
  if (!record.id.trim()) throw new Error('Outcome id is required.')
  if (!record.intervention.trim() || !record.metric.trim()) throw new Error('Outcome intervention and metric are required.')
  if (!record.observed.every(Number.isFinite) || !record.baseline.every(Number.isFinite)) throw new Error('Outcome observations must be finite numbers.')
  await adapter.save(record)
  return structuredClone(record)
}

export async function getOutcome(id: string): Promise<OutcomeRecord | undefined> {
  if (!id.trim()) return undefined
  const value = await adapter.get(id)
  return value ? structuredClone(value) : undefined
}

export async function listOutcomes(): Promise<OutcomeRecord[]> {
  const value = await adapter.list()
  return value.map((item) => structuredClone(item)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function removeOutcome(id: string): Promise<boolean> {
  if (!id.trim()) return false
  return adapter.remove(id)
}
