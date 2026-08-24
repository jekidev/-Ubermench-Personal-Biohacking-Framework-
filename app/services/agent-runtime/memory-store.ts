import type { MemoryRecord } from '~/services/agent-superstack/types'
import type { RuntimeStore, AgentRun } from './types'

const MEMORY_KEY = 'ubermench-agent-memory-v2'
const RUN_KEY = 'ubermench-agent-runs-v2'

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* persistence is best-effort */ }
}

export class BrowserRuntimeStore implements RuntimeStore {
  async loadMemory(): Promise<MemoryRecord[]> { return readJson<MemoryRecord[]>(MEMORY_KEY, []) }
  async saveMemory(records: MemoryRecord[]): Promise<void> { writeJson(MEMORY_KEY, records) }
  async appendRun(run: AgentRun): Promise<void> {
    const runs = readJson<AgentRun[]>(RUN_KEY, [])
    runs.unshift(run)
    writeJson(RUN_KEY, runs.slice(0, 100))
  }
  async loadRuns(limit = 20): Promise<AgentRun[]> { return readJson<AgentRun[]>(RUN_KEY, []).slice(0, limit) }
}

export const browserRuntimeStore = new BrowserRuntimeStore()
