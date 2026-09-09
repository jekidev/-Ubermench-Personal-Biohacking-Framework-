import type { MedicationRecord, SupplementRecord } from '~/types/biology'
import { checkPharmacologyInteractions } from './pharmacology-engine'
import { detectDuplicateIngredients } from './ingredient-normalizer'

export type SafetySeverity = 'green' | 'yellow' | 'orange' | 'red'

export type SafetyFlagKind = 'interaction' | 'contraindication' | 'monitoring' | 'info'

export interface SafetyFlag {
  severity: SafetySeverity
  code: string
  title: string
  detail: string
  requiresReview: boolean
  kind?: SafetyFlagKind
  provenance?: string
  monitoringMetrics?: string[]
}

const HIGH_RISK_TERMS = ['warfarin', 'apixaban', 'rivaroxaban', 'heparin', 'clopidogrel', 'insulin', 'opioid', 'benzodiazepine']
const CNS_DEPRESSANTS = ['pregabalin', 'gabapentin', 'baclofen', 'zolpidem', 'doxepin', 'mirtazapine', 'mirtazapin', 'olanzapine', 'olanzapin']
const SEROTONERGIC_AGENTS = ['mirtazapin', 'mirtazapine', 'nortriptylin', 'nortriptyline', 'ssri', 'snri', 'olanzapin', 'olanzapine']
const DOPAMINE_AGONISTS = ['pramipexol', 'pramipexole', 'ropinirol', 'rotigotine']
const STIMULANTS = ['methylphenidat', 'methylphenidate', 'amphetamine', 'lisdexamfetamine', 'modafinil']
const BP_LOWERING = ['nebivolol', 'propranolol', 'metoprolol', 'tadalafil', 'amlodipine', 'losartan', 'lisinopril']

function includesTerm(value: string, terms: string[]) {
  const normalized = value.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

export function screenInterventionSafety(
  intervention: string,
  medications: MedicationRecord[],
  supplements: SupplementRecord[] = [],
): SafetyFlag[] {
  const activeMeds = medications.filter((x) => x.active)
  const activeSupplements = supplements.filter((x) => x.active)
  const all = [...activeMeds.map((x) => x.name), ...activeSupplements.map((x) => x.name)]
  const flags: SafetyFlag[] = []

  if (!intervention.trim()) return flags

  if (includesTerm(intervention, ['anticoagulant', 'blood thinner']) && activeMeds.some((m) => includesTerm(m.name, HIGH_RISK_TERMS))) {
    flags.push({ severity: 'red', code: 'BLEEDING_INTERACTION', title: 'Potential bleeding-risk interaction', detail: 'The active medication list contains a high-risk antithrombotic while the proposed intervention may increase bleeding risk.', requiresReview: true })
  }

  if (activeMeds.some((m) => includesTerm(m.name, CNS_DEPRESSANTS)) && includesTerm(intervention, ['sedative', 'sleep aid', 'alcohol', 'opioid', 'benzodiazepine'])) {
    flags.push({ severity: 'orange', code: 'CNS_DEPRESSANT_STACK', title: 'CNS-depressant stacking', detail: 'Multiple central nervous system depressant effects may compound sedation, impaired coordination or respiratory risk.', requiresReview: true })
  }

  const serotonergicMeds = activeMeds.filter((m) => includesTerm(m.name, SEROTONERGIC_AGENTS))
  if (serotonergicMeds.length >= 2) {
    flags.push({ severity: 'red', code: 'SEROTONERGIC_POLYPHARMACY', title: 'Multiple serotonergic agents active', detail: 'The active medication list contains multiple serotonergic agents (for example mirtazapine with nortriptyline). This combination requires close psychiatric and cardiological monitoring.', requiresReview: true })
  }

  if (activeMeds.some((m) => includesTerm(m.name, DOPAMINE_AGONISTS)) && activeMeds.some((m) => includesTerm(m.name, STIMULANTS))) {
    flags.push({ severity: 'orange', code: 'DOPAMINE_STIMULANT_COMBO', title: 'Dopamine agonist with stimulant', detail: 'Pramipexole-type dopamine agonism combined with methylphenidate-type stimulant effects may increase activation, sleep disruption and cardiovascular load.', requiresReview: true })
  }

  if (includesTerm(intervention, SEROTONERGIC_AGENTS) && serotonergicMeds.length > 0) {
    flags.push({ severity: 'red', code: 'SEROTONERGIC_INTERVENTION', title: 'Proposed serotonergic addition', detail: 'The proposed intervention may add serotonergic load on top of existing serotonergic medication.', requiresReview: true })
  }

  if (activeMeds.some((m) => includesTerm(m.name, BP_LOWERING)) && includesTerm(intervention, ['vasodilator', 'nitrate', 'blood pressure lowering', 'tadalafil', 'sildenafil'])) {
    flags.push({ severity: 'orange', code: 'BP_LOWERING_STACK', title: 'Potential blood-pressure stacking', detail: 'The current regimen already contains blood-pressure-lowering agents and the intervention may add another effect.', requiresReview: true })
  }

  const normalizedIntervention = intervention.toLowerCase()
  const duplicateMechanism = all.some((name) => {
    const n = name.toLowerCase()
    return (n.includes('beta-block') || n.includes('nebivolol') || n.includes('propranolol')) && normalizedIntervention.includes('beta blocker')
  })
  if (duplicateMechanism) {
    flags.push({ severity: 'yellow', code: 'DUPLICATE_MECHANISM', title: 'Possible duplicate mechanism', detail: 'The proposed intervention may duplicate an active pharmacologic mechanism.', requiresReview: true })
  }

  const duplicateIngredients = detectDuplicateIngredients([...all, intervention])
  for (const ingredient of duplicateIngredients) {
    flags.push({
      severity: 'yellow',
      code: 'DUPLICATE_INGREDIENT',
      title: 'Duplicate ingredient detected',
      detail: `Multiple active entries appear to provide the same ingredient (${ingredient}). Review cumulative dose.`,
      requiresReview: true,
    })
  }

  const pharmacology = checkPharmacologyInteractions([...all, intervention])
  for (const finding of pharmacology) {
    flags.push({
      severity: finding.severity === 'critical' ? 'red' : finding.severity === 'warning' ? 'orange' : 'yellow',
      code: `PHARM_${finding.a.toUpperCase()}_${finding.b.toUpperCase()}`.replace(/[^A-Z0-9_]+/g, '_'),
      title: 'Pharmacology interaction flagged',
      detail: finding.mechanism,
      requiresReview: finding.severity !== 'info',
    })
  }

  if (flags.length === 0) flags.push({ severity: 'green', code: 'NO_KNOWN_RULE_TRIGGERED', title: 'No built-in rule triggered', detail: 'The local rule set found no high-priority interaction. This is not proof of safety.', requiresReview: false })
  return flags
}

export function highestSafetySeverity(flags: SafetyFlag[]): SafetySeverity {
  const rank: Record<SafetySeverity, number> = { green: 0, yellow: 1, orange: 2, red: 3 }
  return flags.reduce<SafetySeverity>((current, item) => rank[item.severity] > rank[current] ? item.severity : current, 'green')
}
