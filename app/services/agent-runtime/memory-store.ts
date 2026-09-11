import type { MemoryRecord } from '~/services/agent-superstack/types'
import { AGENT_MEMORY_STORAGE_KEY, loadPersistedAgentMemories, savePersistedAgentMemories } from '~/services/agent-memory-persistence'
import type { RuntimeStore, AgentRun, AgentAuditEvent } from './types'
import { TauriRuntimeStore, isTauriRuntime } from './tauri-store'

const MEMORY_KEY = AGENT_MEMORY_STORAGE_KEY
const RUN_KEY = 'ubermench-agent-runs-v2'
const AUDIT_KEY = 'ubermench-agent-audit-v1'

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
  async loadMemory(): Promise<MemoryRecord[]> { return loadPersistedAgentMemories(typeof localStorage === 'undefined' ? undefined : localStorage) }
  async saveMemory(records: MemoryRecord[]): Promise<void> { savePersistedAgentMemories(records, typeof localStorage === 'undefined' ? undefined : localStorage) }
  async appendRun(run: AgentRun): Promise<void> {
    const runs = readJson<AgentRun[]>(RUN_KEY, [])
    const next = [run, ...runs.filter((item) => item.id !== run.id)]
    writeJson(RUN_KEY, next.slice(0, 100))
  }
  async loadRuns(limit = 20): Promise<AgentRun[]> { return readJson<AgentRun[]>(RUN_KEY, []).slice(0, limit) }
  async findRunByTaskId(taskId: string): Promise<AgentRun | undefined> {
    return readJson<AgentRun[]>(RUN_KEY, []).find((item) => item.task.id === taskId)
  }
  async appendAudit(event: AgentAuditEvent): Promise<void> {
    const events = readJson<AgentAuditEvent[]>(AUDIT_KEY, [])
    const next = [event, ...events.filter((item) => item.id !== event.id)]
    writeJson(AUDIT_KEY, next.slice(0, 500))
  }
  async loadAudit(limit = 100): Promise<AgentAuditEvent[]> { return readJson<AgentAuditEvent[]>(AUDIT_KEY, []).slice(0, Math.max(1, Math.min(500, limit))) }
}

export const browserRuntimeStore = new BrowserRuntimeStore()
export const tauriRuntimeStore = new TauriRuntimeStore()

export function getRuntimeStore(): RuntimeStore {
  return isTauriRuntime() ? tauriRuntimeStore : browserRuntimeStore
}
