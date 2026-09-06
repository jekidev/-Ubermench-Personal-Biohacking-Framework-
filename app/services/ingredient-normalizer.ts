export const INGREDIENT_ALIASES: Record<string, string[]> = {
  'vitamin-d': ['vitamin d', 'vitamin d3', 'cholecalciferol', 'd3'],
  magnesium: ['magnesium', 'magnesium glycinate', 'magnesium citrate'],
  omega3: ['omega-3', 'omega 3', 'fish oil', 'epa', 'dha'],
  creatine: ['creatine', 'creatine monohydrate'],
}

export function normalizeIngredientName(value: string): string {
  const normalized = value.trim().toLowerCase()
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) return canonical
  }
  return normalized
}

export function detectDuplicateIngredients(names: string[]): string[] {
  const seen = new Map<string, string>()
  const duplicates: string[] = []
  for (const name of names) {
    const canonical = normalizeIngredientName(name)
    const existing = seen.get(canonical)
    if (existing && existing !== name) duplicates.push(canonical)
    else seen.set(canonical, name)
  }
  return duplicates
}
