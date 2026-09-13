import type { DietProtocol, MedicationRecord, PersonalBiologyProfile, SupplementRecord } from '~/types/biology'

export function trimText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function parseRestrictionList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function formatRestrictionList(values?: string[]): string {
  return (values ?? []).filter((item) => item.trim()).join(', ')
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createSupplementRecord(input: {
  name: string
  dose?: string
  frequency?: string
  timing?: string
  notes?: string
  active?: boolean
  id?: string
}): SupplementRecord {
  const name = trimText(input.name)
  if (!name) throw new Error('Supplement name is required')
  return {
    id: trimText(input.id) ?? createId('supplement'),
    name,
    dose: trimText(input.dose),
    frequency: trimText(input.frequency),
    timing: trimText(input.timing),
    notes: trimText(input.notes),
    active: input.active ?? true,
  }
}

export function createMedicationRecord(input: {
  name: string
  dose?: string
  frequency?: string
  notes?: string
  startedAt?: string
  stoppedAt?: string
  active?: boolean
  id?: string
}): MedicationRecord {
  const name = trimText(input.name)
  if (!name) throw new Error('Medication name is required')
  return {
    id: trimText(input.id) ?? createId('medication'),
    name,
    dose: trimText(input.dose),
    frequency: trimText(input.frequency),
    notes: trimText(input.notes),
    startedAt: trimText(input.startedAt),
    stoppedAt: trimText(input.stoppedAt),
    active: input.active ?? true,
  }
}

export function upsertRecord<T extends { id: string }>(list: T[], record: T): T[] {
  const index = list.findIndex((item) => item.id === record.id)
  if (index < 0) return [...list, record]
  return list.map((item, current) => (current === index ? record : item))
}

export function patchRecord<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item))
}

export function removeRecord<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id)
}

export function normalizeDietProtocol(raw: unknown): DietProtocol | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const restrictions = Array.isArray(record.restrictions)
    ? record.restrictions.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
    : typeof record.restrictions === 'string'
      ? parseRestrictionList(record.restrictions)
      : []
  const protein = typeof record.proteinTargetGrams === 'number' && Number.isFinite(record.proteinTargetGrams)
    ? record.proteinTargetGrams
    : typeof record.proteinTargetGrams === 'string' && record.proteinTargetGrams.trim()
      ? Number(record.proteinTargetGrams)
      : undefined
  const diet: DietProtocol = {
    pattern: trimText(record.pattern),
    notes: trimText(record.notes),
    restrictions: restrictions.length ? restrictions : undefined,
    eatingWindow: trimText(record.eatingWindow),
    proteinTargetGrams: protein !== undefined && Number.isFinite(protein) && protein > 0 ? protein : undefined,
    updatedAt: trimText(record.updatedAt),
  }
  return hasDietProtocol(diet) ? diet : undefined
}

export function hasDietProtocol(diet?: DietProtocol): boolean {
  if (!diet) return false
  return Boolean(
    trimText(diet.pattern)
    || trimText(diet.notes)
    || trimText(diet.eatingWindow)
    || (diet.restrictions && diet.restrictions.length)
    || (typeof diet.proteinTargetGrams === 'number' && diet.proteinTargetGrams > 0),
  )
}

export function applyDietProtocol(profile: PersonalBiologyProfile, diet: DietProtocol | undefined, updatedAt = new Date().toISOString()): PersonalBiologyProfile {
  const next = normalizeDietProtocol(diet ? { ...diet, updatedAt } : undefined)
  return { ...profile, diet: next, updatedAt }
}

export function applySupplement(profile: PersonalBiologyProfile, record: SupplementRecord): PersonalBiologyProfile {
  return { ...profile, supplements: upsertRecord(profile.supplements, record) }
}

export function applyMedication(profile: PersonalBiologyProfile, record: MedicationRecord): PersonalBiologyProfile {
  return { ...profile, medications: upsertRecord(profile.medications, record) }
}
