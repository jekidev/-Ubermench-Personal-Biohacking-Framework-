export type InterventionTier = 1 | 2 | 3

export type InterventionRecord = {
  id: string
  name: string
  tier: InterventionTier
  domain: string
  mechanism?: string
  evidenceLevel: 'strong' | 'moderate' | 'emerging' | 'experimental'
  monitoring?: string[]
  safetyNotes?: string[]
}

export const LONGEVITY_INTERVENTION_REGISTRY: InterventionRecord[] = [
  { id: 'exercise-zone2', name: 'Zone 2 aerobic training', tier: 1, domain: 'cardiovascular', evidenceLevel: 'strong', monitoring: ['resting HR', 'HRV', 'VO2 proxy'] },
  { id: 'resistance-training', name: 'Resistance training', tier: 1, domain: 'fitness', evidenceLevel: 'strong', monitoring: ['strength', 'lean mass proxy'] },
  { id: 'sleep-consistency', name: 'Sleep timing consistency', tier: 1, domain: 'recovery', evidenceLevel: 'strong', monitoring: ['sleep duration', 'HRV'] },
  { id: 'protein-adequacy', name: 'Adequate dietary protein', tier: 1, domain: 'nutrition', evidenceLevel: 'strong', monitoring: ['albumin', 'body composition'] },
  { id: 'lipid-monitoring', name: 'ApoB/LDL monitoring', tier: 1, domain: 'cardiovascular', evidenceLevel: 'strong', monitoring: ['ApoB', 'LDL-C', 'triglycerides'] },
  { id: 'metformin-research', name: 'Metformin (research context)', tier: 3, domain: 'metabolic', evidenceLevel: 'emerging', safetyNotes: ['Requires clinician review', 'Monitor B12 and GI tolerance'] },
  { id: 'rapamycin-research', name: 'Rapamycin (research context)', tier: 3, domain: 'geroscience', evidenceLevel: 'experimental', safetyNotes: ['Immunosuppression risk', 'Clinician-only decision support'] },
  { id: 'nad-precursors', name: 'NAD+ precursors', tier: 2, domain: 'mitochondrial', evidenceLevel: 'emerging', monitoring: ['subjective recovery', 'glucose markers'] },
  { id: 'omega3', name: 'Omega-3 supplementation', tier: 2, domain: 'inflammation', evidenceLevel: 'moderate', monitoring: ['triglycerides', 'CRP'] },
  { id: 'vitamin-d', name: 'Vitamin D optimization', tier: 2, domain: 'endocrine', evidenceLevel: 'moderate', monitoring: ['25-OH vitamin D', 'calcium'] },
]

export function interventionsByTier(tier?: InterventionTier): InterventionRecord[] {
  if (!tier) return [...LONGEVITY_INTERVENTION_REGISTRY]
  return LONGEVITY_INTERVENTION_REGISTRY.filter((item) => item.tier === tier)
}

export function interventionById(id: string): InterventionRecord | undefined {
  return LONGEVITY_INTERVENTION_REGISTRY.find((item) => item.id === id)
}
