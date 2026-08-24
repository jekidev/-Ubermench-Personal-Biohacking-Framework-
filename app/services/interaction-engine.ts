import type { MedicationRecord, SupplementRecord } from '~/types/biology'

export interface InteractionFlag { severity: 'info' | 'caution' | 'high'; subject: string; reason: string; evidenceIds?: string[] }
export interface InteractionNode { id: string; kind: 'drug' | 'supplement' | 'gene' | 'biomarker' | 'condition'; name: string }
export interface InteractionEdge { from: string; to: string; mechanism: string; severity: 'low' | 'moderate' | 'high'; evidenceIds?: string[] }

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

export function findInteractions(nodes: InteractionNode[], edges: InteractionEdge[], activeIds: string[]): InteractionEdge[] {
  const active = new Set(activeIds)
  const nodeIds = new Set(nodes.map((node) => node.id))
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && (active.has(edge.from) || active.has(edge.to)))
}

export function highestRisk(edges: InteractionEdge[]): InteractionEdge | undefined {
  const weight = { low: 1, moderate: 2, high: 3 }
  return [...edges].sort((a, b) => weight[b.severity] - weight[a.severity])[0]
}

export function riskScore(edges: InteractionEdge[]): number {
  const raw = edges.reduce((sum, edge) => sum + (edge.severity === 'high' ? 0.35 : edge.severity === 'moderate' ? 0.18 : 0.06), 0)
  return Math.min(1, raw)
}
