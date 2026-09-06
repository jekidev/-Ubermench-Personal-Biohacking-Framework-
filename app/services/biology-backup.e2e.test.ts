import { describe, expect, it } from 'vitest'
import { createBiologyBackup, parseBiologyBackup, serializeBiologyBackup } from './biology-backup'
import { validateImportCandidate } from './biology-import-validator'
import { emptyBiologyProfile } from './biology-store'

describe('biology backup lifecycle', () => {
  it('create -> export -> clear -> import -> verify', async () => {
    const original = emptyBiologyProfile()
    original.goals = ['longevity']
    original.biomarkers.push({
      id: 'glucose-1',
      name: 'Glucose',
      value: 5.1,
      unit: 'mmol/L',
      measuredAt: '2026-08-25T08:00:00.000Z',
      source: 'lab-import',
    })

    const backup = await createBiologyBackup(original, '2026-08-25T09:00:00.000Z')
    const exported = serializeBiologyBackup(backup)
    const cleared = emptyBiologyProfile()
    expect(cleared.goals).toEqual([])

    const parsed = await parseBiologyBackup(exported)
    const validation = validateImportCandidate(parsed, cleared)
    expect(validation.valid).toBe(true)
    expect(validation.incoming.goals).toEqual(['longevity'])
    expect(validation.incoming.biomarkers[0]?.name).toBe('Glucose')
    expect(validation.metadata?.biomarkerCount).toBe(1)
    expect(validation.checksum).toBe(backup.checksum)
  })
})
