import type { EvidenceItem, InterventionCandidate, PersonalBiologyProfile } from '../types/biology'

export interface LongevitySignal {
  biomarkerId: string
  name: string
  direction: 'low' | 'high' | 'in-range' | 'unknown'
  severity: number
  rationale: string
}

export interface LongevityAssessment {
  score: number
  signals: LongevitySignal[]
  priorities: string[]
  disclaimer: string
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export function assessLongevity(profile: PersonalBiologyProfile): LongevityAssessment {
  const signals: LongevitySignal[] = []

  for (const biomarker of profile.biomarkers) {
    if (biomarker.referenceLow == null || biomarker.referenceHigh == null) continue
    const range = biomarker.referenceHigh - biomarker.referenceLow
    if (range <= 0) continue

    const margin = range * 0.1
    const low = biomarker.value < biomarker.referenceLow
    const high = biomarker.value > biomarker.referenceHigh
    const nearLow = biomarker.value < biomarker.referenceLow + margin
    const nearHigh = biomarker.value > biomarker.referenceHigh - margin

    if (low) {
      signals.push({
        biomarkerId: biomarker.id,
        name: biomarker.name,
        direction: 'low',
        severity: clamp(60 + ((biomarker.referenceLow - biomarker.value) / range) * 40),
        rationale: `${biomarker.name} is below the supplied laboratory reference interval.`
      })
    } else if (high) {
      signals.push({
        biomarkerId: biomarker.id,
        name: biomarker.name,
        direction: 'high',
        severity: clamp(60 + ((biomarker.value - biomarker.referenceHigh) / range) * 40),
        rationale: `${biomarker.name} is above the supplied laboratory reference interval.`
      })
    } else if (nearLow || nearHigh) {
      signals.push({
        biomarkerId: biomarker.id,
        name: biomarker.name,
        direction: nearLow ? 'low' : 'high',
        severity: 20,
        rationale: `${biomarker.name} is close to the supplied laboratory reference boundary.`
      })
    } else {
      signals.push({
        biomarkerId: biomarker.id,
        name: biomarker.name,
        direction: 'in-range',
        severity: 0,
        rationale: `${biomarker.name} is inside the supplied laboratory reference interval.`
      })
    }
  }

  const actionable = signals.filter(signal => signal.severity > 0).sort((a, b) => b.severity - a.severity)
  const burden = actionable.reduce((sum, signal) => sum + signal.severity, 0)
  const score = clamp(100 - Math.min(70, burden / Math.max(1, profile.biomarkers.length) * 0.7))

  return {
    score: Math.round(score * 10) / 10,
    signals,
    priorities: actionable.slice(0, 5).map(signal => signal.name),
    disclaimer: 'Screening output only. It does not diagnose disease or establish biological age, mortality risk, or treatment recommendations.'
  }
}

export function rankInterventions(candidates: InterventionCandidate[]): InterventionCandidate[] {
  const evidenceWeight: Record<EvidenceItem['evidenceLevel'], number> = {
    'meta-analysis': 1,
    'randomized-trial': 0.9,
    'human-study': 0.75,
    observational: 0.55,
    mechanistic: 0.35,
    animal: 0.2,
    'in-silico': 0.1,
    'expert-opinion': 0.1
  }

  return [...candidates]
    .map(candidate => {
      const evidenceScore = candidate.evidence.length === 0
        ? 0
        : candidate.evidence.reduce((sum, item) => sum + evidenceWeight[item.evidenceLevel] * clamp(item.confidence), 0) / candidate.evidence.length
      const priority = clamp(clamp(candidate.personalFit) * 0.55 + evidenceScore * 0.35 + clamp(candidate.priority) * 0.1)
      return { ...candidate, priority: Math.round(priority * 10) / 10 }
    })
    .sort((a, b) => b.priority - a.priority)
}
