import Database from '@tauri-apps/plugin-sql'
import type { MemoryRecord } from '~/services/agent-superstack/types'
import type { AgentAuditEvent, AgentRun, RuntimeStore } from './types'

let databasePromise: ReturnType<typeof Database.load> | undefined

async function database() {
  databasePromise ??= Database.load('sqlite:ubermench-agent.db')
  const db = await databasePromise
  await db.execute('CREATE TABLE IF NOT EXISTS agent_memory (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)')
  await db.execute('CREATE TABLE IF NOT EXISTS agent_runs (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL)')
  await db.execute('CREATE TABLE IF NOT EXISTS agent_audit (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, type TEXT NOT NULL, detail TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)')
  return db
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export class TauriRuntimeStore implements RuntimeStore {
  async loadMemory(): Promise<MemoryRecord[]> {
    const db = await database()
    const rows = await db.select<Array<{ payload: string }>>('SELECT payload FROM agent_memory ORDER BY updated_at DESC')
    return rows.map((row) => JSON.parse(row.payload) as MemoryRecord)
  }

  async saveMemory(records: MemoryRecord[]): Promise<void> {
    const db = await database()
    await db.execute('BEGIN')
    try {
      for (const record of records) {
        await db.execute('INSERT INTO agent_memory (id, payload, updated_at) VALUES ($1, $2, $3) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at', [record.id, JSON.stringify(record), new Date(record.updatedAt).toISOString()])
      }
      await db.execute('COMMIT')
    } catch (error) {
      await db.execute('ROLLBACK')
      throw error
    }
  }

  async appendRun(run: AgentRun): Promise<void> {
    const db = await database()
    await db.execute('INSERT OR REPLACE INTO agent_runs (id, payload, created_at) VALUES ($1, $2, $3)', [run.id, JSON.stringify(run), run.startedAt])
    await db.execute('DELETE FROM agent_runs WHERE id IN (SELECT id FROM agent_runs ORDER BY created_at DESC LIMIT -1 OFFSET 100)')
  }

  async loadRuns(limit = 20): Promise<AgentRun[]> {
    const db = await database()
    const rows = await db.select<Array<{ payload: string }>>('SELECT payload FROM agent_runs ORDER BY created_at DESC LIMIT $1', [Math.max(1, Math.min(100, limit))])
    return rows.map((row) => JSON.parse(row.payload) as AgentRun)
  }

  async appendAudit(event: AgentAuditEvent): Promise<void> {
    const db = await database()
    await db.execute('INSERT OR REPLACE INTO agent_audit (id, run_id, type, detail, payload, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [event.id, event.runId, event.type, event.detail, JSON.stringify(event.metadata ?? {}), event.createdAt])
  }

  async loadAudit(limit = 100): Promise<AgentAuditEvent[]> {
    const db = await database()
    const rows = await db.select<Array<{ id: string; run_id: string; type: AgentAuditEvent['type']; detail: string; payload: string; created_at: string }>>('SELECT id, run_id, type, detail, payload, created_at FROM agent_audit ORDER BY created_at DESC LIMIT $1', [Math.max(1, Math.min(500, limit))])
    return rows.map((row) => ({ id: row.id, runId: row.run_id, type: row.type, detail: row.detail, createdAt: row.created_at, metadata: JSON.parse(row.payload) as Record<string, unknown> }))
  }
}
