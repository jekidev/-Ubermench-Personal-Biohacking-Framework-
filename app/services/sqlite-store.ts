import type { PersonalBiologyProfile } from '~/types/biology'

const DB_PATH = 'sqlite:ubermench.db'
const PROFILE_KEY = 'personal-biology:v1'

interface SqlDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number }>
  select<T>(query: string, bindValues?: unknown[]): Promise<T>
}

type SqlModule = typeof import('@tauri-apps/plugin-sql')

async function getDatabase(): Promise<SqlDatabase> {
  const { default: Database } = await import('@tauri-apps/plugin-sql') as SqlModule
  return Database.load(DB_PATH)
}

async function migrate(db: SqlDatabase): Promise<void> {
  await db.execute(`CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS biology_profiles (
    profile_key TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)
}

export async function loadSqliteBiologyProfile(): Promise<PersonalBiologyProfile | null> {
  const db = await getDatabase()
  await migrate(db)
  const rows = await db.select<Array<{ payload: string; schema_version: number }>>(
    'SELECT payload, schema_version FROM biology_profiles WHERE profile_key = $1 LIMIT 1',
    [PROFILE_KEY],
  )
  const row = rows[0]
  if (!row || row.schema_version !== 1) return null
  try {
    return JSON.parse(row.payload) as PersonalBiologyProfile
  } catch {
    return null
  }
}

export async function saveSqliteBiologyProfile(profile: PersonalBiologyProfile): Promise<void> {
  const db = await getDatabase()
  await migrate(db)
  const updatedAt = new Date().toISOString()
  await db.execute(
    `INSERT INTO biology_profiles(profile_key, schema_version, payload, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(profile_key) DO UPDATE SET
       schema_version = excluded.schema_version,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    [PROFILE_KEY, 1, JSON.stringify({ ...profile, updatedAt }), updatedAt],
  )
}

export async function clearSqliteBiologyProfile(): Promise<void> {
  const db = await getDatabase()
  await migrate(db)
  await db.execute('DELETE FROM biology_profiles WHERE profile_key = $1', [PROFILE_KEY])
}
