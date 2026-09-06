export const PAPER_QA_SCI_HUB_ENABLED = false as const

export type PaperQaCitation = {
  key: string
  title: string
  doi?: string
  pages?: string
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
