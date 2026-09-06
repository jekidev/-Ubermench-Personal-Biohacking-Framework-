import { normalizeIngredientName } from './ingredient-normalizer'

export interface ParsedDose {
  value: number
  unit: string
}

export interface DoseBearingItem {
  name: string
  dose?: string
  active?: boolean
}

export interface CumulativeDoseFinding {
  ingredient: string
  entries: Array<{ name: string; dose?: string }>
  total?: ParsedDose
  warning: string
}

const UNIT_ALIASES: Record<string, string> = {
  mcg: 'mcg',
  ug: 'mcg',
  µg: 'mcg',
  μg: 'mcg',
  iu: 'iu',
  mg: 'mg',
  g: 'g',
}

export function parseDose(dose?: string): ParsedDose | undefined {
  if (!dose) return undefined
  const match = dose.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Zµμ]+)/)
  if (!match?.[1] || !match[2]) return undefined
  const unit = UNIT_ALIASES[match[2].toLowerCase()] ?? match[2].toLowerCase()
  return { value: Number(match[1]), unit }
}

export function detectCumulativeDoses(items: DoseBearingItem[]): CumulativeDoseFinding[] {
  const groups = new Map<string, DoseBearingItem[]>()
  for (const item of items) {
    if (item.active === false) continue
    const key = normalizeIngredientName(item.name)
    const existing = groups.get(key) ?? []
    existing.push(item)
    groups.set(key, existing)
  }

  const findings: CumulativeDoseFinding[] = []
  for (const [ingredient, entries] of groups) {
    if (entries.length < 2) continue
    const parsed = entries.map((entry) => parseDose(entry.dose))
    const comparable = parsed.filter((item): item is ParsedDose => Boolean(item))
    const sameUnit = comparable.length >= 2 && comparable.every((item) => item.unit === comparable[0]?.unit)
    const total = sameUnit && comparable[0]
      ? { value: comparable.reduce((sum, item) => sum + item.value, 0), unit: comparable[0].unit }
      : undefined
    findings.push({
      ingredient,
      entries: entries.map((entry) => ({ name: entry.name, dose: entry.dose })),
      total,
      warning: total
        ? `Combined labelled dose is ${total.value} ${total.unit}. Review whether this exceeds a safe daily amount.`
        : 'Multiple active entries appear to provide the same ingredient. Review cumulative dose and units.',
    })
  }
  return findings
}
