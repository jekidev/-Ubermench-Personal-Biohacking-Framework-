export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type InterpretationType = 'observation' | 'association' | 'causal-evidence' | 'hypothesis'
export type RiskDirection = 'lower' | 'higher' | 'context-dependent' | 'unknown'

export type EvidenceRecord = {
  id: string
  biomarker: string
  grade: EvidenceGrade
  interpretation: InterpretationType
  riskDirection: RiskDirection
  title: string
  summary: string
  source?: string
  sourceVersion?: string
  reviewedAt?: string
}

export type RiskContext = {
  age?: number
  sex?: string
  smoking?: boolean
  diabetes?: boolean
  hypertension?: boolean
  knownCardiovascularDisease?: boolean
  familyHistory?: string[]
  medications?: string[]
}

export type RiskAssessment = {
  biomarker: string
  evidence?: EvidenceRecord
  contextApplied: string[]
  status: 'informational' | 'needs-review' | 'insufficient-evidence'
  statement: string
}

export function assessEvidence(record: EvidenceRecord | undefined, context: RiskContext = {}): RiskAssessment {
  if (!record) {
    return {
      biomarker: 'unknown',
      contextApplied: [],
      status: 'insufficient-evidence',
      statement: 'No evidence record is linked to this observation.',
    }
  }

  const contextApplied: string[] = []
  if (context.age !== undefined) contextApplied.push(`age:${context.age}`)
  if (context.sex) contextApplied.push(`sex:${context.sex}`)
  if (context.smoking !== undefined) contextApplied.push(`smoking:${context.smoking}`)
  if (context.diabetes !== undefined) contextApplied.push(`diabetes:${context.diabetes}`)
  if (context.hypertension !== undefined) contextApplied.push(`hypertension:${context.hypertension}`)
  if (context.knownCardiovascularDisease !== undefined) contextApplied.push(`knownCVD:${context.knownCardiovascularDisease}`)

  return {
    biomarker: record.biomarker,
    evidence: record,
    contextApplied,
    status: record.grade === 'A' || record.grade === 'B' ? 'informational' : 'needs-review',
    statement: record.summary,
  }
}
