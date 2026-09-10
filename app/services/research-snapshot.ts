import type { EvidenceLevel } from '~/types/biology'
import { extractEvidenceClaims, highestClaimUncertainty, type ExtractedClaim } from './evidence-claims'
import { evidenceFreshness, type EvidenceFreshnessBand } from './evidence-freshness'
import { evaluateRetraction, type RetractionStatus } from './evidence-retraction'
import type { NormalizedEvidenceRecord } from './evidence-normalizer'
import { assertNoSecretsInExport } from './secret-leak-guard'

export const RESEARCH_SNAPSHOT_VERSION = 1 as const
export const RESEARCH_SNAPSHOT_STORAGE_KEY = 'ubermench.research.snapshots.v1'

export interface ResearchSnapshotRecord {
  id: string
  title: string
  doi?: string
  pmid?: string
  evidenceLevel: EvidenceLevel
  claimUncertainty: 'high' | 'medium' | 'low'
  freshnessBand: EvidenceFreshnessBand
  retractionStatus: RetractionStatus
}

export interface ResearchSnapshot {
  format: 'ubermench-research-snapshot'
  version: typeof RESEARCH_SNAPSHOT_VERSION
  createdAt: string
  query?: string
  recordCount: number
  retractedCount: number
  concernCount: number
  claims: ExtractedClaim[]
  records: ResearchSnapshotRecord[]
  checksum: string
}

export async function createResearchSnapshot(
  records: readonly NormalizedEvidenceRecord[],
  options?: { query?: string; createdAt?: string; now?: Date },
): Promise<ResearchSnapshot> {
  if (!Array.isArray(records)) throw new Error('Research snapshot records must be an array')
  const createdAt = options?.createdAt ?? new Date().toISOString()
  const now = options?.now ?? new Date(createdAt)
  const claims = records.flatMap((record) => extractEvidenceClaims(record))
  const mapped: ResearchSnapshotRecord[] = records.map((record) => {
    const retraction = evaluateRetraction({
      evidenceId: record.id,
      doi: record.doi,
      retracted: record.retracted,
      retractionNotice: record.retractionNotice,
    })
    return {
      id: record.id,
      title: record.title,
      doi: record.doi,
      pmid: record.pmid,
      evidenceLevel: record.evidenceLevel,
      claimUncertainty: highestClaimUncertainty(extractEvidenceClaims(record)),
      freshnessBand: evidenceFreshness(record.publishedAt, now).band,
      retractionStatus: retraction.status,
    }
  })
  const snapshot: Omit<ResearchSnapshot, 'checksum'> = {
    format: 'ubermench-research-snapshot',
    version: RESEARCH_SNAPSHOT_VERSION,
    createdAt,
    query: options?.query?.trim() || undefined,
    recordCount: mapped.length,
    retractedCount: mapped.filter((record) => record.retractionStatus === 'retracted').length,
    concernCount: mapped.filter((record) => record.retractionStatus === 'expression-of-concern').length,
    claims,
    records: mapped,
  }
  assertNoSecretsInExport('research-snapshot', snapshot)
  return { ...snapshot, checksum: await hashSnapshot(snapshot) }
}

export async function parseResearchSnapshot(raw: string): Promise<ResearchSnapshot> {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed) || parsed.format !== 'ubermench-research-snapshot' || parsed.version !== RESEARCH_SNAPSHOT_VERSION) {
    throw new Error('Unsupported Ubermench research snapshot')
  }
  const snapshot = parsed as unknown as ResearchSnapshot
  const expected = await hashSnapshot({ ...snapshot, checksum: undefined })
  if (snapshot.checksum !== expected) throw new Error('Research snapshot checksum mismatch')
  return snapshot
}

export function loadResearchSnapshots(storage: Pick<Storage, 'getItem'> | undefined = defaultStorage()): ResearchSnapshot[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(RESEARCH_SNAPSHOT_STORAGE_KEY)
    return raw ? JSON.parse(raw) as ResearchSnapshot[] : []
  } catch {
    return []
  }
}

export function persistResearchSnapshot(
  snapshot: ResearchSnapshot,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = defaultStorage(),
): ResearchSnapshot[] {
  if (!storage) return [snapshot]
  const next = [snapshot, ...loadResearchSnapshots(storage)].slice(0, 20)
  storage.setItem(RESEARCH_SNAPSHOT_STORAGE_KEY, JSON.stringify(next))
  return next
}

async function hashSnapshot(snapshot: Omit<ResearchSnapshot, 'checksum'> & { checksum?: string }): Promise<string> {
  const canonical = JSON.stringify({
    format: snapshot.format,
    version: snapshot.version,
    createdAt: snapshot.createdAt,
    query: snapshot.query ?? null,
    recordCount: snapshot.recordCount,
    retractedCount: snapshot.retractedCount,
    concernCount: snapshot.concernCount,
    claims: snapshot.claims,
    records: snapshot.records,
  })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
