import type { BiomarkerRecord, MedicationRecord, PersonalBiologyProfile, SupplementRecord } from '~/types/biology'
import type { SafetyFlag, SafetySeverity } from './safety-engine'

export type StructuredSafetyKind = 'contraindication' | 'monitoring'

export interface StructuredSafetyRule {
  id: string
  kind: StructuredSafetyKind
  title: string
  detail: string
  severity: SafetySeverity
  provenance: string
  medicationTerms?: string[]
  supplementTerms?: string[]
  goalTerms?: string[]
  missingBiomarkerTerms?: string[]
  biomarkerThresholds?: Array<{ name: string; op: 'gt' | 'lt'; value: number }>
  monitoringMetrics?: string[]
  monitoringCadence?: string
}

export const LOCAL_SAFETY_CATALOG_VERSION = 'ubermench-safety-rules.v1'

const PROVENANCE = `${LOCAL_SAFETY_CATALOG_VERSION}: local conservative heuristic. Not a clinical guideline and not proof of safety or harm.`

export const LOCAL_SAFETY_RULES: StructuredSafetyRule[] = [
  {
    id: 'anticoagulant-bleeding-labs',
    kind: 'monitoring',
    title: 'Antithrombotic therapy: bleeding labs not in profile',
    detail: 'An active antithrombotic is listed, but the local profile has no hemoglobin or platelet observation. Ask a clinician about monitoring; this app does not set a cadence.',
    severity: 'orange',
    provenance: PROVENANCE,
    medicationTerms: ['warfarin', 'apixaban', 'rivaroxaban', 'heparin', 'clopidogrel', 'dabigatran', 'edoxaban'],
    missingBiomarkerTerms: ['hemoglobin', 'haemoglobin', 'platelet'],
    monitoringMetrics: ['hemoglobin', 'platelets', 'bleeding symptoms'],
    monitoringCadence: 'Clinician-directed. The app does not recommend a schedule.',
  },
  {
    id: 'insulin-glucose-monitoring',
    kind: 'monitoring',
    title: 'Glucose-lowering therapy: glucose/HbA1c not in profile',
    detail: 'An insulin or sulfonylurea is listed, but the local profile has no glucose or HbA1c observation. Glycemic monitoring belongs with a clinician.',
    severity: 'orange',
    provenance: PROVENANCE,
    medicationTerms: ['insulin', 'glipizide', 'gliclazide', 'glimepiride', 'glyburide', 'glibenclamide'],
    missingBiomarkerTerms: ['glucose', 'hba1c', 'hb a1c'],
    monitoringMetrics: ['glucose', 'HbA1c', 'hypoglycemia symptoms'],
    monitoringCadence: 'Clinician-directed. The app does not recommend a schedule.',
  },
  {
    id: 'retinoid-pregnancy-goal',
    kind: 'contraindication',
    title: 'Retinoid / high-dose vitamin A with a pregnancy-related goal',
    detail: 'The profile lists a pregnancy-related goal and an active retinoid or high-dose vitamin A entry. This combination requires clinician review and is treated as a hard stop in this local rule set.',
    severity: 'red',
    provenance: PROVENANCE,
    supplementTerms: ['isotretinoin', 'tretinoin', 'retinoid', 'retinol', 'vitamin a', 'vitamin-a'],
    medicationTerms: ['isotretinoin', 'tretinoin', 'acitretin'],
    goalTerms: ['pregnan', 'conception', 'trying to conceive'],
  },
  {
    id: 'stimulant-severe-sbp',
    kind: 'contraindication',
    title: 'Stimulant with a very high recorded systolic blood pressure',
    detail: 'An active stimulant is listed and the latest systolic blood pressure observation is above 180. This is a local conservative stop, not a diagnosis.',
    severity: 'red',
    provenance: PROVENANCE,
    medicationTerms: ['methylphenidat', 'methylphenidate', 'amphetamine', 'lisdexamfetamine', 'modafinil'],
    biomarkerThresholds: [{ name: 'systolic', op: 'gt', value: 180 }],
  },
]

function includesTerm(value: string, terms: string[]): boolean {
  const normalized = value.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

function activeNames(medications: MedicationRecord[], supplements: SupplementRecord[]): string[] {
  return [
    ...medications.filter((item) => item.active).map((item) => item.name),
    ...supplements.filter((item) => item.active).map((item) => item.name),
  ]
}

function latestMatchingBiomarker(biomarkers: BiomarkerRecord[], name: string): BiomarkerRecord | undefined {
  return biomarkers
    .filter((item) => item.name.toLowerCase().includes(name.toLowerCase()) && Number.isFinite(item.value))
    .slice()
    .sort((left, right) => Date.parse(right.measuredAt) - Date.parse(left.measuredAt) || left.id.localeCompare(right.id))[0]
}

function agentMatches(rule: StructuredSafetyRule, names: string[]): boolean {
  const meds = rule.medicationTerms ?? []
  const supplements = rule.supplementTerms ?? []
  const terms = [...meds, ...supplements]
  if (!terms.length) return true
  return names.some((name) => includesTerm(name, terms))
}

function goalsMatch(rule: StructuredSafetyRule, goals: string[]): boolean {
  if (!rule.goalTerms?.length) return true
  return goals.some((goal) => includesTerm(goal, rule.goalTerms!))
}

function missingRequiredMarkers(rule: StructuredSafetyRule, biomarkers: BiomarkerRecord[]): boolean {
  if (!rule.missingBiomarkerTerms?.length) return false
  return !biomarkers.some((item) => includesTerm(item.name, rule.missingBiomarkerTerms!))
}

function thresholdTriggered(rule: StructuredSafetyRule, biomarkers: BiomarkerRecord[]): boolean {
  if (!rule.biomarkerThresholds?.length) return false
  return rule.biomarkerThresholds.every((threshold) => {
    const latest = latestMatchingBiomarker(biomarkers, threshold.name)
    if (!latest) return false
    return threshold.op === 'gt' ? latest.value > threshold.value : latest.value < threshold.value
  })
}

export function evaluateStructuredSafetyRules(profile: PersonalBiologyProfile): SafetyFlag[] {
  if (!profile || typeof profile !== 'object') throw new Error('Safety rule profile must be an object')
  const names = activeNames(profile.medications ?? [], profile.supplements ?? [])
  const flags: SafetyFlag[] = []

  for (const rule of LOCAL_SAFETY_RULES) {
    if (!agentMatches(rule, names)) continue
    if (!goalsMatch(rule, profile.goals ?? [])) continue

    const missing = missingRequiredMarkers(rule, profile.biomarkers ?? [])
    const threshold = thresholdTriggered(rule, profile.biomarkers ?? [])
    const needsCondition = Boolean(rule.missingBiomarkerTerms?.length || rule.biomarkerThresholds?.length)
    if (needsCondition && !missing && !threshold) continue
    if (rule.kind === 'contraindication' && rule.goalTerms?.length && !goalsMatch(rule, profile.goals ?? [])) continue

    flags.push({
      severity: rule.severity,
      code: rule.kind === 'contraindication' ? `CONTRA_${rule.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}` : `MONITOR_${rule.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
      title: rule.title,
      detail: rule.detail,
      requiresReview: true,
      kind: rule.kind,
      provenance: rule.provenance,
      monitoringMetrics: rule.monitoringMetrics,
    })
  }

  return flags
}
