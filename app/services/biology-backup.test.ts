import { describe, expect, it } from 'vitest'
import { createBiologyBackup, parseBiologyBackup, serializeBiologyBackup } from './biology-backup'
import { emptyBiologyProfile } from './biology-store'

describe('biology backup', () => {
  it('round-trips a personal biology profile', async () => {
    const profile = emptyBiologyProfile()
    profile.goals = ['healthspan']
    profile.biomarkers.push({
      id: 'crp-1',
      name: 'CRP',
      value: 1.2,
      unit: 'mg/L',
      measuredAt: '2026-08-25T08:00:00.000Z',
      source: 'lab-import',
    })

    const backup = await createBiologyBackup(profile, '2026-08-25T09:00:00.000Z')
    const parsed = await parseBiologyBackup(serializeBiologyBackup(backup))

    expect(parsed.profile.goals).toEqual(['healthspan'])
    expect(parsed.profile.biomarkers[0]?.name).toBe('CRP')
    expect(parsed.checksum).toBeTruthy()
    expect(parsed.metadata?.biomarkerCount).toBe(1)
  })

  it('round-trips a user-entered stack and diet protocol', async () => {
    const profile = emptyBiologyProfile()
    profile.supplements.push({ id: 's1', name: 'Magnesium', dose: '200 mg', frequency: 'nightly', timing: 'bedtime', active: true })
    profile.medications.push({ id: 'm1', name: 'Levothyroxine', dose: '50 mcg', active: true })
    profile.diet = { pattern: 'High-protein Mediterranean', eatingWindow: '16:8', proteinTargetGrams: 140, restrictions: ['seed oils'] }

    const parsed = await parseBiologyBackup(serializeBiologyBackup(await createBiologyBackup(profile)))
    expect(parsed.profile.supplements[0]?.name).toBe('Magnesium')
    expect(parsed.profile.medications[0]?.name).toBe('Levothyroxine')
    expect(parsed.profile.diet?.pattern).toBe('High-protein Mediterranean')
    expect(parsed.metadata?.supplementCount).toBe(1)
  })

  it('rejects an unknown backup format or version', async () => {
    await expect(parseBiologyBackup(JSON.stringify({ format: 'other', version: 1 }))).rejects.toThrow()
    await expect(parseBiologyBackup(JSON.stringify({ format: 'ubermench-biology-backup', version: 99 }))).rejects.toThrow()
  })

  it('rejects checksum mismatch', async () => {
    const backup = await createBiologyBackup(emptyBiologyProfile())
    backup.checksum = 'invalid'
    await expect(parseBiologyBackup(serializeBiologyBackup(backup))).rejects.toThrow(/checksum/i)
  })

  it('migrates and normalizes profiles during parse', async () => {
    const backup = await createBiologyBackup(emptyBiologyProfile())
    const envelope = JSON.parse(serializeBiologyBackup(backup)) as Record<string, unknown>
    envelope.profile = {
      version: 1,
      goals: ['healthspan', 1],
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    delete envelope.checksum
    const parsed = await parseBiologyBackup(JSON.stringify(envelope))
    expect(parsed.profile.goals).toEqual(['healthspan'])
    expect(parsed.profile.biomarkers).toEqual([])
  })

  it('does not mutate the source profile when creating a backup', async () => {
    const profile = emptyBiologyProfile()
    const backup = await createBiologyBackup(profile)
    backup.profile.goals.push('copied')

    expect(profile.goals).toEqual([])
  })

  it('creates backups from reactive proxy profiles', async () => {
    const profile = emptyBiologyProfile()
    profile.goals = ['healthspan']
    const reactiveProfile = new Proxy(profile, {
      get(target, property, receiver) {
        return Reflect.get(target, property, receiver)
      },
    })

    const backup = await createBiologyBackup(reactiveProfile)
    expect(backup.profile.goals).toEqual(['healthspan'])
    expect(backup.checksum).toBeTruthy()
  })
})
