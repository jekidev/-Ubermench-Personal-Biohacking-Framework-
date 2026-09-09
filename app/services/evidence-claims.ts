import type { EvidenceLevel } from '~/types/biology'

export type ClaimPolarity = 'increase' | 'decrease' | 'association' | 'null' | 'unclear'
export type ClaimUncertainty = 'high' | 'medium' | 'low'

export interface ExtractedClaim {
  text: string
  polarity: ClaimPolarity
  uncertainty: ClaimUncertainty
  hedges: string[]
  source: 'title' | 'summary'
  numericEffect?: string
}

const HEDGE_TERMS = ['may', 'might', 'could', 'suggests', 'suggested', 'possible', 'potential', 'appears', 'likely', 'possibly', 'putative']
const INCREASE_TERMS = ['increases', 'increased', 'increase', 'improves', 'improved', 'raises', 'elevates', 'enhances', 'higher']
const DECREASE_TERMS = ['decreases', 'decreased', 'decrease', 'reduces', 'reduced', 'lowers', 'attenuates', 'inhibits', 'lower']
const ASSOCIATION_TERMS = ['associated with', 'association with', 'correlates with', 'linked to']
const NULL_TERMS = ['no effect', 'no significant', 'did not', 'nonsignificant', 'non-significant', 'no difference']

export function extractEvidenceClaims(input: {
  title: string
  summary?: string
  evidenceLevel?: EvidenceLevel
}): ExtractedClaim[] {
  if (!input || typeof input !== 'object') throw new Error('Evidence claim input must be an object')
  const title = requireText(input.title, 'Evidence title')
  const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
  const claims: ExtractedClaim[] = []

  for (const sentence of splitSentences(summary)) {
    claims.push(claimFromSentence(sentence, 'summary', input.evidenceLevel))
  }

  if (!claims.length) {
    claims.push(claimFromSentence(title, 'title', input.evidenceLevel))
  }

  return claims
}

export function highestClaimUncertainty(claims: readonly ExtractedClaim[]): ClaimUncertainty {
  if (!claims.length) return 'high'
  if (claims.some((claim) => claim.uncertainty === 'high')) return 'high'
  if (claims.some((claim) => claim.uncertainty === 'medium')) return 'medium'
  return 'low'
}

function claimFromSentence(text: string, source: ExtractedClaim['source'], evidenceLevel?: EvidenceLevel): ExtractedClaim {
  const normalized = text.toLowerCase()
  const hedges = HEDGE_TERMS.filter((term) => includesTerm(normalized, term))
  const polarity = detectPolarity(normalized)
  const numericEffect = extractNumericEffect(text)
  return {
    text: text.slice(0, 400),
    polarity,
    uncertainty: inferUncertainty(evidenceLevel, hedges, numericEffect),
    hedges,
    source,
    numericEffect,
  }
}

function detectPolarity(normalized: string): ClaimPolarity {
  if (NULL_TERMS.some((term) => normalized.includes(term))) return 'null'
  if (ASSOCIATION_TERMS.some((term) => normalized.includes(term))) return 'association'
  const increase = INCREASE_TERMS.some((term) => includesTerm(normalized, term))
  const decrease = DECREASE_TERMS.some((term) => includesTerm(normalized, term))
  if (increase && !decrease) return 'increase'
  if (decrease && !increase) return 'decrease'
  return 'unclear'
}

function inferUncertainty(
  evidenceLevel: EvidenceLevel | undefined,
  hedges: string[],
  numericEffect?: string,
): ClaimUncertainty {
  if (hedges.length) return 'high'
  if (evidenceLevel === 'meta-analysis' && numericEffect) return 'low'
  if (evidenceLevel === 'randomized-trial' && numericEffect) return 'medium'
  if (evidenceLevel === 'meta-analysis' || evidenceLevel === 'randomized-trial') return 'medium'
  return 'high'
}

function extractNumericEffect(text: string): string | undefined {
  const match = text.match(/-?\d+(?:\.\d+)?\s*(?:%|mmol\/l|mg\/dl|ms|bpm|kg|years?)/i)
  return match?.[0]?.trim()
}

function splitSentences(text: string): string[] {
  if (!text) return []
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
}

function includesTerm(haystack: string, term: string): boolean {
  return new RegExp(`(?:^|[^a-z])${escapeRegExp(term)}(?:$|[^a-z])`, 'i').test(haystack)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`)
  return value.trim()
}
