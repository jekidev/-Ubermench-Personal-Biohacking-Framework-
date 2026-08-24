import type { MedicationRecord, SupplementRecord } from '~/types/biology'

export interface InteractionFlag { severity: 'info' | 'caution' | 'high'; subject: string; reason: string }

const KNOWN_FLAGS: Array<{ a: RegExp; b: RegExp; severity: InteractionFlag['severity']; reason: string }> = [
  { a: /warfarin/i, b: /omega.?3|fish oil/i, severity: 'caution', reason: 'Potential additive bleeding effect; verify dose and clinical context.' },
  { a: /sedative|pregabalin|benzodiazepine/i, b: /sedative|alcohol|sleep aid/i, severity: 'caution', reason: 'Potential additive CNS depression.' },
  { a: /beta.?blocker|nebivolol/i, b: /beta.?blocker|nebivolol/i, severity: 'caution', reason: 'Duplicate beta-adrenergic blockade may lower heart rate or blood pressure.' },
]

export function screenInteractions(medications: MedicationRecord[], supplements: SupplementRecord[]): InteractionFlag[] {
  const activeMeds = medications.filter((item) => item.active)
  const activeSupplements = supplements.filter((item) => item.active)
  const flags: InteractionFlag[] = []
  for (const med of activeMeds) for (const supplement of activeSupplements) {
    const rule = KNOWN_FLAGS.find((item) => (item.a.test(med.name) && item.b.test(supplement.name)) || (item.a.test(supplement.name) && item.b.test(med.name)))
    if (rule) flags.push({ severity: rule.severity, subject: `${med.name} + ${supplement.name}`, reason: rule.reason })
  }
  return flags
}
