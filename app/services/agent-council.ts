export type CouncilRole = 'researcher' | 'biomedical' | 'pharmacology' | 'statistician' | 'safety' | 'auditor' | 'synthesizer'

export interface CouncilOpinion {
  role: CouncilRole
  provider: string
  model: string
  conclusion: string
  confidence: number
  evidenceIds?: string[]
  concerns?: string[]
}

export interface CouncilDecision {
  conclusion: string
  confidence: number
  disagreements: string[]
  opinions: CouncilOpinion[]
}

export function synthesizeCouncil(opinions: CouncilOpinion[]): CouncilDecision {
  if (!opinions.length) return { conclusion: 'No council opinions available.', confidence: 0, disagreements: [], opinions: [] }
  const confidence = opinions.reduce((sum, opinion) => sum + Math.max(0, Math.min(1, opinion.confidence)), 0) / opinions.length
  const normalized = opinions.map((opinion) => opinion.conclusion.trim().toLowerCase()).filter(Boolean)
  const disagreements = [...new Set(normalized.filter((value, index) => normalized.indexOf(value) !== index))]
  const lead = [...opinions].sort((a, b) => b.confidence - a.confidence)[0]
  return {
    conclusion: lead.conclusion,
    confidence,
    disagreements,
    opinions,
  }
}
