import { describe, expect, it } from 'vitest'
import { createBiologyBackup, parseBiologyBackup, serializeBiologyBackup } from './biology-backup'
import { emptyBiologyProfile } from './biology-store'

describe('biology backup', () => {
  it('round-trips a personal biology profile', () => {
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

    const backup = createBiologyBackup(profile, '2026-08-25T09:00:00.000Z')
    const parsed = parseBiologyBackup(serializeBiologyBackup(backup))

    expect(parsed).toEqual(backup)
    expect(parsed.profile.goals).toEqual(['healthspan'])
    expect(parsed.profile.biomarkers[0]?.name).toBe('CRP')
  })

  it('rejects an unknown backup format or version', () => {
    expect(() => parseBiologyBackup(JSON.stringify({ format: 'other', version: 1 }))).toThrow()
    expect(() => parseBiologyBackup(JSON.stringify({ format: 'ubermench-biology-backup', version: 99 }))).toThrow()
  })

  it('does not mutate the source profile when creating a backup', () => {
    const profile = emptyBiologyProfile()
    const backup = createBiologyBackup(profile)
    backup.profile.goals.push('copied')

    expect(profile.goals).toEqual([])
  })
})
