import type { MedicationRecord, SupplementRecord } from '~/types/biology'
import { checkPharmacologyInteractions } from './pharmacology-engine'

export type SafetySeverity = 'green' | 'yellow' | 'orange' | 'red'

export interface SafetyFlag {
  severity: SafetySeverity
  code: string
  title: string
  detail: string
  requiresReview: boolean
}

const HIGH_RISK_TERMS = ['warfarin', 'apixaban', 'rivaroxaban', 'heparin', 'clopidogrel', 'insulin', 'opioid', 'benzodiazepine']
const CNS_DEPRESSANTS = ['pregabalin', 'gabapentin', 'baclofen', 'zolpidem', 'doxepin', 'mirtazapine']
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
