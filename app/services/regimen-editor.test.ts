import { describe, expect, it } from 'vitest'
import { emptyBiologyProfile } from './biology-store'
import {
  applyDietProtocol,
  applySupplement,
  createMedicationRecord,
  createSupplementRecord,
  formatRestrictionList,
  hasDietProtocol,
  normalizeDietProtocol,
  parseRestrictionList,
  patchRecord,
  removeRecord,
} from './regimen-editor'

describe('regimen editor', () => {
  it('creates supplement and medication records with trimmed fields', () => {
    const supplement = createSupplementRecord({
      name: '  Magnesium glycinate  ',
      dose: '200 mg',
      frequency: 'nightly',
      timing: 'bedtime',
    })
    const medication = createMedicationRecord({ name: 'Levothyroxine', dose: '50 mcg', frequency: 'morning' })
    expect(supplement.name).toBe('Magnesium glycinate')
    expect(supplement.active).toBe(true)
    expect(medication.name).toBe('Levothyroxine')
    expect(() => createSupplementRecord({ name: '   ' })).toThrow(/required/i)
  })

  it('upserts, patches and removes stack items', () => {
    const first = createSupplementRecord({ name: 'Creatine', dose: '5 g' })
    const profile = applySupplement(emptyBiologyProfile(), first)
    const updated = patchRecord(profile.supplements, first.id, { dose: '3 g', active: false })
    expect(updated[0]?.dose).toBe('3 g')
    expect(updated[0]?.active).toBe(false)
    expect(removeRecord(updated, first.id)).toEqual([])
  })

  it('normalizes diet protocol and drops empty drafts', () => {
    expect(normalizeDietProtocol({})).toBeUndefined()
    expect(hasDietProtocol({})).toBe(false)
    const diet = normalizeDietProtocol({
      pattern: '  High-protein Mediterranean  ',
      restrictions: 'seed oils, alcohol',
      eatingWindow: '16:8',
      proteinTargetGrams: '140',
      notes: 'Two meals, protein first.',
    })
    expect(diet?.pattern).toBe('High-protein Mediterranean')
    expect(diet?.restrictions).toEqual(['seed oils', 'alcohol'])
    expect(diet?.proteinTargetGrams).toBe(140)
    expect(formatRestrictionList(diet?.restrictions)).toBe('seed oils, alcohol')
    expect(parseRestrictionList('dairy; gluten\neggs')).toEqual(['dairy', 'gluten', 'eggs'])

    const next = applyDietProtocol(emptyBiologyProfile(), diet)
    expect(next.diet?.pattern).toBe('High-protein Mediterranean')
    expect(applyDietProtocol(next, {}).diet).toBeUndefined()
  })
})
