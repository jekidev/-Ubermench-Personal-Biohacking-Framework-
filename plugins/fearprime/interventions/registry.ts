export type FearprimeInterventionRecord = {
  id: string
  name: string
  category: 'psychotherapy' | 'pharmacology' | 'neuromodulation' | 'lifestyle' | 'research'
  evidenceLevel: 'strong' | 'moderate' | 'emerging' | 'experimental'
  targets: string[]
  monitoring?: string[]
  safetyNotes?: string[]
}

export const FEARPRIME_INTERVENTION_REGISTRY: FearprimeInterventionRecord[] = [
  { id: 'pe', name: 'Prolonged exposure', category: 'psychotherapy', evidenceLevel: 'strong', targets: ['extinction', 'retrieval'], monitoring: ['PCL-5', 'fear ratings'] },
  { id: 'cpt', name: 'Cognitive processing therapy', category: 'psychotherapy', evidenceLevel: 'strong', targets: ['memory updating'], monitoring: ['PCL-5', 'intrusions'] },
  { id: 'emdr', name: 'EMDR', category: 'psychotherapy', evidenceLevel: 'moderate', targets: ['bilateral stimulation', 'memory reconsolidation'], monitoring: ['distress ratings'] },
  { id: 'hrv-biofeedback', name: 'HRV biofeedback', category: 'neuromodulation', evidenceLevel: 'moderate', targets: ['autonomic regulation'], monitoring: ['HRV', 'sleep'] },
  { id: 'sleep-optimization', name: 'Sleep optimization', category: 'lifestyle', evidenceLevel: 'strong', targets: ['consolidation', 'recovery'], monitoring: ['sleep quality', 'intrusions'] },
  { id: 'prazosin', name: 'Prazosin (nightmares)', category: 'pharmacology', evidenceLevel: 'moderate', targets: ['nightmares', 'hyperarousal'], safetyNotes: ['Blood pressure monitoring', 'Clinician review required'] },
  { id: 'ssri-snri', name: 'SSRI/SNRI (PTSD symptom support)', category: 'pharmacology', evidenceLevel: 'strong', targets: ['hyperarousal', 'mood'], safetyNotes: ['Serotonin interaction screening', 'Clinician review required'] },
  { id: 'ketamine-research', name: 'Ketamine (research context)', category: 'research', evidenceLevel: 'emerging', targets: ['plasticity'], safetyNotes: ['Dissociation risk', 'Specialist-only'] },
]

export function fearprimeInterventionById(id: string): FearprimeInterventionRecord | undefined {
  return FEARPRIME_INTERVENTION_REGISTRY.find((item) => item.id === id)
}
