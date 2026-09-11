import type { MemoryRecord } from '~/services/agent-superstack/types'

export const AGENT_MEMORY_STORAGE_KEY = 'ubermensch-agent-memory-v2'

type AgentMemoryStorage = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): AgentMemoryStorage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function loadPersistedAgentMemories(
  storage: AgentMemoryStorage | undefined = defaultStorage(),
): MemoryRecord[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(AGENT_MEMORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MemoryRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePersistedAgentMemories(
  records: MemoryRecord[],
  storage: AgentMemoryStorage | undefined = defaultStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(AGENT_MEMORY_STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* persistence is best-effort */
  }
}
