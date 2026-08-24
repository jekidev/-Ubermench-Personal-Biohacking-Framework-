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

const memoryStore = new Map<string, OutcomeRecord>()

function runtimeStore(): Map<string, OutcomeRecord> {
  return memoryStore
}

export function saveOutcome(record: OutcomeRecord): OutcomeRecord {
  if (!record.id.trim()) throw new Error('Outcome id is required.')
  runtimeStore().set(record.id, structuredClone(record))
  return record
}

export function getOutcome(id: string): OutcomeRecord | undefined {
  const value = runtimeStore().get(id)
  return value ? structuredClone(value) : undefined
}

export function listOutcomes(): OutcomeRecord[] {
  return [...runtimeStore().values()].map((item) => structuredClone(item)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function removeOutcome(id: string): boolean {
  return runtimeStore().delete(id)
}
