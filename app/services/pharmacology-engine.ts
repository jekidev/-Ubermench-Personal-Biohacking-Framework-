export type InteractionSeverity = 'info' | 'warning' | 'critical'

export interface PharmacologyEntity {
  id: string
  name: string
  class?: string
  targets?: string[]
  enzymes?: string[]
  mechanisms?: string[]
  monitoring?: string[]
}

export interface PharmacologyInteraction {
  a: string
  b: string
  severity: InteractionSeverity
  mechanism: string
  monitoring: string[]
  source: string
}

const ENTITY_REGISTRY: PharmacologyEntity[] = [
  { id: 'cns-depressant', name: 'CNS depressant', mechanisms: ['CNS depression'], monitoring: ['sedation', 'respiratory status'] },
  { id: 'vasodilator', name: 'Vasodilator', mechanisms: ['vasodilation'], monitoring: ['blood pressure', 'dizziness'] },
  { id: 'anticoagulant', name: 'Anticoagulant', mechanisms: ['anticoagulation'], monitoring: ['bleeding'] },
  { id: 'serotonergic', name: 'Serotonergic agent', mechanisms: ['serotonin signaling'], monitoring: ['agitation', 'tremor', 'temperature'] },
]

const INTERACTIONS: PharmacologyInteraction[] = [
  { a: 'cns-depressant', b: 'cns-depressant', severity: 'critical', mechanism: 'Additive CNS depression can impair alertness and respiratory drive.', monitoring: ['sedation', 'respiratory status'], source: 'built-in-rule' },
  { a: 'vasodilator', b: 'vasodilator', severity: 'warning', mechanism: 'Additive blood-pressure lowering can increase hypotension/dizziness risk.', monitoring: ['blood pressure', 'dizziness'], source: 'built-in-rule' },
  { a: 'anticoagulant', b: 'anticoagulant', severity: 'warning', mechanism: 'Additive anticoagulant effect can increase bleeding risk.', monitoring: ['bleeding'], source: 'built-in-rule' },
  { a: 'serotonergic', b: 'serotonergic', severity: 'critical', mechanism: 'Multiple serotonergic agents may increase serotonin-toxicity risk.', monitoring: ['agitation', 'tremor', 'temperature'], source: 'built-in-rule' },
]

function normalize(value: string) { return value.trim().toLowerCase() }

export function classifyPharmacology(name: string): PharmacologyEntity | undefined {
  const normalized = normalize(name)
  return ENTITY_REGISTRY.find((entity) => normalized.includes(entity.name.toLowerCase()) || entity.mechanisms?.some((mechanism) => normalized.includes(mechanism.toLowerCase())))
}

export function checkPharmacologyInteractions(names: string[]): PharmacologyInteraction[] {
  const classifications = names.map((name) => ({ name, entity: classifyPharmacology(name) })).filter((item): item is { name: string; entity: PharmacologyEntity } => Boolean(item.entity))
  const findings: PharmacologyInteraction[] = []
  for (let i = 0; i < classifications.length; i += 1) {
    for (let j = i + 1; j < classifications.length; j += 1) {
      const a = classifications[i].entity
      const b = classifications[j].entity
      const match = INTERACTIONS.find((item) => (item.a === a.id && item.b === b.id) || (item.a === b.id && item.b === a.id))
      if (match) findings.push({ ...match, a: classifications[i].name, b: classifications[j].name })
    }
  }
  return findings
}

export function registeredPharmacologyEntities() { return [...ENTITY_REGISTRY] }
