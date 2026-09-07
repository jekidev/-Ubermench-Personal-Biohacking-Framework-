export type RetractionStatus = 'not-retracted' | 'retracted' | 'expression-of-concern' | 'unknown'

export interface RetractionFinding {
  evidenceId: string
  doi?: string
  status: RetractionStatus
  source: 'record' | 'crossref' | 'registry'
  notice?: string
}

const RETRACTION_TYPES = new Set(['retraction', 'withdrawal', 'retracted', 'withdrawn'])
const CONCERN_TYPES = new Set(['expression_of_concern', 'expression-of-concern', 'concern'])

export function evaluateRetraction(input: {
  evidenceId: string
  doi?: string
  retracted?: boolean
  retractionNotice?: string
  crossrefWork?: unknown
  registry?: ReadonlySet<string>
}): RetractionFinding {
  if (!input || typeof input !== 'object') throw new Error('Retraction input must be an object')
  const evidenceId = input.evidenceId.trim()
  if (!evidenceId) throw new Error('Retraction evidenceId is required')
  const doi = normalizeDoi(input.doi)

  if (input.retracted === true) {
    return {
      evidenceId,
      doi,
      status: 'retracted',
      source: 'record',
      notice: input.retractionNotice?.trim() || 'Record marked retracted by the evidence payload.',
    }
  }

  if (doi && input.registry?.has(doi)) {
    return {
      evidenceId,
      doi,
      status: 'retracted',
      source: 'registry',
      notice: 'DOI is present in the local retraction registry.',
    }
  }

  if (input.crossrefWork !== undefined) {
    return retractionFromCrossrefWork(evidenceId, doi, input.crossrefWork)
  }

  return {
    evidenceId,
    doi,
    status: doi || input.retracted === false ? 'not-retracted' : 'unknown',
    source: 'record',
  }
}

export function retractionFromCrossrefWork(evidenceId: string, doi: string | undefined, work: unknown): RetractionFinding {
  const updates = collectCrossrefUpdates(work)
  if (updates.some((type) => RETRACTION_TYPES.has(type))) {
    return {
      evidenceId,
      doi,
      status: 'retracted',
      source: 'crossref',
      notice: 'Crossref update-to includes a retraction or withdrawal.',
    }
  }
  if (updates.some((type) => CONCERN_TYPES.has(type))) {
    return {
      evidenceId,
      doi,
      status: 'expression-of-concern',
      source: 'crossref',
      notice: 'Crossref update-to includes an expression of concern.',
    }
  }
  return {
    evidenceId,
    doi,
    status: 'not-retracted',
    source: 'crossref',
  }
}

function collectCrossrefUpdates(work: unknown): string[] {
  const root = isRecord(work) ? (isRecord(work.message) ? work.message : work) : {}
  const updates = Array.isArray(root['update-to']) ? root['update-to'] : []
  return updates
    .map((item) => (isRecord(item) && typeof item.type === 'string' ? item.type.trim().toLowerCase() : ''))
    .filter(Boolean)
}

function normalizeDoi(value?: string): string | undefined {
  if (!value?.trim()) return undefined
  return value.trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
