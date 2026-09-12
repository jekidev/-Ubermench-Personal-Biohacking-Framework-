import { searchDocuments } from '../../plugins/longevity/rag/document-index'

export const PAPER_QA_SCI_HUB_ENABLED = false as const
export const PAPER_QA_SETTINGS_HREF = '/settings?tab=research'
export const PAPER_QA_BLOODS_HREF = '/longevity/bloods'
export const PAPER_QA_DRIVE_HREF = '/health-sync'
export const PAPER_QA_CONNECTOR_OFF_MESSAGE =
  'PaperQA connector is off. Enable it in Settings → Research, then retry research.paperqa.ask.'
export const PAPER_QA_EMPTY_INDEX_MESSAGE =
  'No indexed lab PDFs matched this question. On this phone, index a lab PDF via Bloods or Drive first, then retry research.paperqa.ask.'

export type PaperQaConnectorOffResult = {
  ok: false
  error: string
  settingsHref: typeof PAPER_QA_SETTINGS_HREF
  connectorId: 'paper-qa'
  enabled: false
}

export function paperQaFailedResult(error: string): Omit<PaperQaConnectorOffResult, 'enabled'> & { enabled?: false } {
  const message = error.trim() || PAPER_QA_CONNECTOR_OFF_MESSAGE
  return {
    ok: false,
    error: message,
    settingsHref: PAPER_QA_SETTINGS_HREF,
    connectorId: 'paper-qa',
  }
}

export type PaperQaCitation = {
  key: string
  title: string
  doi?: string
  pages?: string
}

export function paperQaConnectorOffResult(): PaperQaConnectorOffResult {
  return {
    ...paperQaFailedResult(PAPER_QA_CONNECTOR_OFF_MESSAGE),
    enabled: false,
  }
}

export type PaperQaEmptyIndexResult = {
  ok: false
  emptyIndex: true
  error: string
  settingsHref: typeof PAPER_QA_SETTINGS_HREF
  bloodsHref: typeof PAPER_QA_BLOODS_HREF
  driveHref: typeof PAPER_QA_DRIVE_HREF
  connectorId: 'paper-qa'
  question: string
  answer: string
  citations: PaperQaCitation[]
  confidence: number
  backend: 'local-rag'
  evidenceNotes: string[]
}

export function paperQaEmptyIndexResult(question: string): PaperQaEmptyIndexResult {
  const normalized = question.trim()
  return {
    ok: false,
    emptyIndex: true,
    error: PAPER_QA_EMPTY_INDEX_MESSAGE,
    settingsHref: PAPER_QA_SETTINGS_HREF,
    bloodsHref: PAPER_QA_BLOODS_HREF,
    driveHref: PAPER_QA_DRIVE_HREF,
    connectorId: 'paper-qa',
    question: normalized,
    answer: PAPER_QA_EMPTY_INDEX_MESSAGE,
    citations: [],
    confidence: 0.1,
    backend: 'local-rag',
    evidenceNotes: ['PaperQA returned no citations — index a lab PDF via Bloods / Drive first.'],
  }
}

export type PaperQaPlan = {
  question: string
  backend: 'paper-qa'
  requiresApproval: true
  requiresLocalRuntime: true
  sciHubEnabled: false
}

export type PaperQaAnswer = {
  question: string
  answer: string
  citations: PaperQaCitation[]
  confidence: number
  backend: 'paper-qa' | 'local-rag'
}

function requireQuestion(question: string): string {
  if (typeof question !== 'string') throw new Error('PaperQA question must be a string')
  const trimmed = question.trim()
  if (!trimmed) throw new Error('PaperQA question cannot be empty')
  if (trimmed.length > 2000) throw new Error('PaperQA question must be under 2000 characters')
  return trimmed
}

export function buildPaperQaPlan(question: string): PaperQaPlan {
  return {
    question: requireQuestion(question),
    backend: 'paper-qa',
    requiresApproval: true,
    requiresLocalRuntime: true,
    sciHubEnabled: PAPER_QA_SCI_HUB_ENABLED,
  }
}

export function validatePaperQaAnswer(payload: unknown): PaperQaAnswer {
  if (!payload || typeof payload !== 'object') throw new Error('PaperQA answer must be an object')
  const record = payload as Record<string, unknown>
  const question = requireQuestion(typeof record.question === 'string' ? record.question : '')
  const answer = typeof record.answer === 'string' ? record.answer.trim() : ''
  if (!answer) throw new Error('PaperQA answer text is required')
  if (record.backend !== 'paper-qa' && record.backend !== 'local-rag') {
    throw new Error('PaperQA backend must be paper-qa or local-rag')
  }
  const citations = Array.isArray(record.citations) ? record.citations : []
  const mapped: PaperQaCitation[] = citations.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('PaperQA citation must be an object')
    const citation = item as Record<string, unknown>
    const title = typeof citation.title === 'string' ? citation.title.trim() : ''
    if (!title) throw new Error('PaperQA citation title is required')
    return {
      key: typeof citation.key === 'string' && citation.key.trim() ? citation.key.trim() : `c${index + 1}`,
      title,
      doi: typeof citation.doi === 'string' ? citation.doi : undefined,
      pages: typeof citation.pages === 'string' ? citation.pages : undefined,
    }
  })
  const confidence = typeof record.confidence === 'number' && Number.isFinite(record.confidence)
    ? Math.max(0, Math.min(1, record.confidence))
    : 0.5
  return {
    question,
    answer,
    citations: mapped,
    confidence,
    backend: record.backend,
  }
}

export function paperQaCitationsToEvidenceNotes(answer: PaperQaAnswer): string[] {
  if (!answer.citations.length) return ['PaperQA returned no citations — treat as unverified.']
  return answer.citations.map((citation) => {
    const doi = citation.doi ? ` DOI ${citation.doi}` : ''
    return `${citation.key}: ${citation.title}${doi}`
  })
}

export function answerPaperQaFromLocalRag(
  question: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): PaperQaAnswer | PaperQaEmptyIndexResult {
  const normalizedQuestion = requireQuestion(question)
  const hits = searchDocuments(normalizedQuestion, 6, storage)
  if (!hits.length) {
    return paperQaEmptyIndexResult(normalizedQuestion)
  }

  const citations = hits.map((hit, index) => ({
    key: `c${index + 1}`,
    title: hit.title,
  }))
  const excerpts = hits
    .map((hit, index) => `[${index + 1}] ${hit.title} (score ${hit.score.toFixed(2)})\n${hit.content.slice(0, 500)}`)
    .join('\n\n')

  return validatePaperQaAnswer({
    question: normalizedQuestion,
    answer: `Local indexed excerpts (${hits.length}) for: ${normalizedQuestion}\n\n${excerpts}`,
    citations,
    backend: 'local-rag',
    confidence: Math.min(0.85, hits[0]?.score ?? 0.3),
  })
}
