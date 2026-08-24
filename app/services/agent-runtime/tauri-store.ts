import Database from '@tauri-apps/plugin-sql'
import type { MemoryRecord } from '~/services/agent-superstack/types'
import type { AgentRun, RuntimeStore } from './types'

let databasePromise: ReturnType<typeof Database.load> | undefined

async function database() {
  databasePromise ??= Database.load('sqlite:ubermench-agent.db')
  const db = await databasePromise
  await db.execute('CREATE TABLE IF NOT EXISTS agent_memory (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)')
  await db.execute('CREATE TABLE IF NOT EXISTS agent_runs (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL)')
  return db
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
}
