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
  { id: 'dopamine-agonist', name: 'Dopamine agonist', mechanisms: ['dopamine agonism'], monitoring: ['impulse control', 'sleep', 'nausea'] },
  { id: 'stimulant', name: 'CNS stimulant', mechanisms: ['catecholamine reuptake inhibition'], monitoring: ['heart rate', 'blood pressure', 'anxiety', 'sleep'] },
  { id: 'anticholinergic', name: 'Anticholinergic agent', mechanisms: ['anticholinergic'], monitoring: ['dry mouth', 'constipation', 'cognitive effects'] },
]

const NAME_CLASSIFICATION: Array<{ terms: string[]; entityId: string }> = [
  { terms: ['mirtazapin', 'mirtazapine'], entityId: 'serotonergic' },
  { terms: ['nortriptylin', 'nortriptyline'], entityId: 'serotonergic' },
  { terms: ['pramipexol', 'pramipexole'], entityId: 'dopamine-agonist' },
  { terms: ['methylphenidat', 'methylphenidate', 'ritalin', 'concerta'], entityId: 'stimulant' },
  { terms: ['olanzapin', 'olanzapine'], entityId: 'serotonergic' },
  { terms: ['pregabalin', 'gabapentin', 'zolpidem', 'benzodiazepine'], entityId: 'cns-depressant' },
]

const INTERACTIONS: PharmacologyInteraction[] = [
  { a: 'cns-depressant', b: 'cns-depressant', severity: 'critical', mechanism: 'Additive CNS depression can impair alertness and respiratory drive.', monitoring: ['sedation', 'respiratory status'], source: 'built-in-rule' },
  { a: 'vasodilator', b: 'vasodilator', severity: 'warning', mechanism: 'Additive blood-pressure lowering can increase hypotension/dizziness risk.', monitoring: ['blood pressure', 'dizziness'], source: 'built-in-rule' },
  { a: 'anticoagulant', b: 'anticoagulant', severity: 'warning', mechanism: 'Additive anticoagulant effect can increase bleeding risk.', monitoring: ['bleeding'], source: 'built-in-rule' },
  { a: 'serotonergic', b: 'serotonergic', severity: 'critical', mechanism: 'Multiple serotonergic agents may increase serotonin-toxicity risk.', monitoring: ['agitation', 'tremor', 'temperature'], source: 'built-in-rule' },
  { a: 'dopamine-agonist', b: 'stimulant', severity: 'warning', mechanism: 'Dopaminergic agonism combined with stimulant catecholamine effects may increase psychiatric and cardiovascular activation.', monitoring: ['anxiety', 'sleep', 'heart rate', 'blood pressure'], source: 'built-in-rule' },
  { a: 'stimulant', b: 'cns-depressant', severity: 'warning', mechanism: 'Stimulant/depressant combinations can mask sedation and complicate autonomic monitoring.', monitoring: ['sleep', 'mood', 'blood pressure'], source: 'built-in-rule' },
]

function normalize(value: string) { return value.trim().toLowerCase() }

export function classifyPharmacology(name: string): PharmacologyEntity | undefined {
  const normalized = normalize(name)
  const mapped = NAME_CLASSIFICATION.find((entry) => entry.terms.some((term) => normalized.includes(term)))
  if (mapped) return ENTITY_REGISTRY.find((entity) => entity.id === mapped.entityId)
  return ENTITY_REGISTRY.find((entity) => normalized.includes(entity.name.toLowerCase()) || entity.mechanisms?.some((mechanism) => normalized.includes(mechanism.toLowerCase())))
}

export function checkPharmacologyInteractions(names: string[]): PharmacologyInteraction[] {
  const classifications = names
    .map((name) => ({ name, entity: classifyPharmacology(name) }))
    .filter((item): item is { name: string; entity: PharmacologyEntity } => Boolean(item.entity))
  const findings: PharmacologyInteraction[] = []
  for (let i = 0; i < classifications.length; i += 1) {
    const left = classifications[i]
    if (!left) continue
    for (let j = i + 1; j < classifications.length; j += 1) {
      const right = classifications[j]
      if (!right) continue
      const match = INTERACTIONS.find((item) => (item.a === left.entity.id && item.b === right.entity.id) || (item.a === right.entity.id && item.b === left.entity.id))
      if (match) findings.push({ ...match, a: left.name, b: right.name })
    }
  }
  return findings
}

export function registeredPharmacologyEntities() { return [...ENTITY_REGISTRY] }
