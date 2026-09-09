import type { MedicationRecord, PersonalBiologyProfile, SupplementRecord } from '~/types/biology'
import { detectCumulativeDoses } from './cumulative-dose'
import { detectDuplicateIngredients } from './ingredient-normalizer'
import { screenInteractions } from './interaction-engine'
import { checkPharmacologyInteractions } from './pharmacology-engine'
import { highestSafetySeverity, type SafetyFlag, type SafetySeverity } from './safety-engine'
import { evaluateStructuredSafetyRules } from './safety-rules'

function includesTerm(value: string, terms: string[]) {
  const normalized = value.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

const SEROTONERGIC_AGENTS = ['mirtazapin', 'mirtazapine', 'nortriptylin', 'nortriptyline', 'ssri', 'snri', 'olanzapin', 'olanzapine']
const DOPAMINE_AGONISTS = ['pramipexol', 'pramipexole', 'ropinirol', 'rotigotine']
const STIMULANTS = ['methylphenidat', 'methylphenidate', 'amphetamine', 'lisdexamfetamine', 'modafinil']

export function screenRegimenSafety(
  medications: MedicationRecord[],
  supplements: SupplementRecord[] = [],
): SafetyFlag[] {
  const activeMeds = medications.filter((item) => item.active)
  const activeSupplements = supplements.filter((item) => item.active)
  const names = [...activeMeds.map((item) => item.name), ...activeSupplements.map((item) => item.name)]
  const flags: SafetyFlag[] = []

  const serotonergicMeds = activeMeds.filter((item) => includesTerm(item.name, SEROTONERGIC_AGENTS))
  if (serotonergicMeds.length >= 2) {
    flags.push({
      severity: 'red',
      code: 'SEROTONERGIC_POLYPHARMACY',
      title: 'Multiple serotonergic agents active',
      detail: 'The active medication list contains multiple serotonergic agents. This combination requires close clinical monitoring.',
      requiresReview: true,
    })
  }

  if (activeMeds.some((item) => includesTerm(item.name, DOPAMINE_AGONISTS)) && activeMeds.some((item) => includesTerm(item.name, STIMULANTS))) {
    flags.push({
      severity: 'orange',
      code: 'DOPAMINE_STIMULANT_COMBO',
      title: 'Dopamine agonist with stimulant',
      detail: 'Dopamine agonism combined with a stimulant may increase activation, sleep disruption and cardiovascular load.',
      requiresReview: true,
    })
  }

  for (const ingredient of detectDuplicateIngredients(names)) {
    flags.push({
      severity: 'yellow',
      code: 'DUPLICATE_INGREDIENT',
      title: 'Duplicate ingredient detected',
      detail: `Multiple active entries appear to provide the same ingredient (${ingredient}). Review cumulative dose.`,
      requiresReview: true,
    })
  }

  for (const finding of detectCumulativeDoses([...activeMeds, ...activeSupplements])) {
    flags.push({
      severity: finding.total ? 'orange' : 'yellow',
      code: 'CUMULATIVE_DOSE',
      title: `Cumulative dose: ${finding.ingredient}`,
      detail: finding.warning,
      requiresReview: true,
    })
  }

  for (const finding of checkPharmacologyInteractions(names)) {
    flags.push({
      severity: finding.severity === 'critical' ? 'red' : finding.severity === 'warning' ? 'orange' : 'yellow',
      code: `PHARM_${finding.a.toUpperCase()}_${finding.b.toUpperCase()}`.replace(/[^A-Z0-9_]+/g, '_'),
      title: 'Pharmacology interaction flagged',
      detail: finding.mechanism,
      requiresReview: finding.severity !== 'info',
    })
  }

  for (const flag of screenInteractions(activeMeds, activeSupplements)) {
    flags.push({
      severity: flag.severity === 'high' ? 'red' : flag.severity === 'caution' ? 'orange' : 'yellow',
      code: 'INTERACTION_ENGINE',
      title: flag.subject,
      detail: flag.reason,
      requiresReview: flag.severity !== 'info',
    })
  }

  return flags
}

export function screenProfileSafety(profile: PersonalBiologyProfile): SafetyFlag[] {
  const flags = [
    ...evaluateStructuredSafetyRules(profile),
    ...screenRegimenSafety(profile.medications, profile.supplements),
  ]
  if (!flags.length) {
    return [{
      severity: 'green',
      code: 'NO_KNOWN_RULE_TRIGGERED',
      title: 'No built-in rule triggered',
      detail: 'The local rule set found no high-priority interaction. This is not proof of safety.',
      requiresReview: false,
    }]
  }
  return flags
}

export function requiresHighRiskConfirmation(flags: SafetyFlag[]): boolean {
  return flags.some((flag) => flag.requiresReview && (flag.severity === 'red' || flag.severity === 'orange'))
}

export function confirmHighRiskFlags(flags: SafetyFlag[], confirmed: boolean): { allowed: boolean; reason: string } {
  if (!requiresHighRiskConfirmation(flags)) {
    return { allowed: true, reason: 'No high-risk confirmation is required for the current safety output.' }
  }
  if (!confirmed) {
    return { allowed: false, reason: 'High-risk safety flags require explicit confirmation before continuing.' }
  }
  return { allowed: true, reason: 'High-risk safety flags were acknowledged. This does not approve treatment changes.' }
}

export function safetyHighlight(flags: SafetyFlag[]): { severity: SafetySeverity; reviewCount: number; title: string } {
  const reviewCount = flags.filter((flag) => flag.requiresReview).length
  const severity = highestSafetySeverity(flags)
  const title = reviewCount
    ? `${reviewCount} safety item${reviewCount === 1 ? '' : 's'} need review`
    : 'No high-priority safety flags'
  return { severity, reviewCount, title }
}
