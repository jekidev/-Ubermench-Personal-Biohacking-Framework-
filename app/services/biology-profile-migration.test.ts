import { describe, expect, it } from 'vitest'
import { migrateBiologyProfile, SUPPORTED_BIOLOGY_PROFILE_VERSIONS } from './biology-profile-migration'
import { emptyBiologyProfile } from './biology-store'

describe('biology profile migration', () => {
  it('lists supported profile versions', () => {
    expect(SUPPORTED_BIOLOGY_PROFILE_VERSIONS).toContain(1)
  })

  it('normalizes a version 1 profile', () => {
    const profile = emptyBiologyProfile()
    profile.goals = ['healthspan']
    const migrated = migrateBiologyProfile(profile)
    expect(migrated.version).toBe(1)
    expect(migrated.goals).toEqual(['healthspan'])
  })

  it('rejects unknown profile versions', () => {
    expect(() => migrateBiologyProfile({ version: 99 })).toThrow(/unsupported/i)
  })

  it('returns empty profile for invalid input', () => {
    expect(migrateBiologyProfile(null).version).toBe(1)
    expect(migrateBiologyProfile(null).biomarkers).toEqual([])
  })

  it('normalizes missing arrays on version 1 profiles', () => {
    const migrated = migrateBiologyProfile({
      version: 1,
      goals: ['longevity', 42],
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(migrated.goals).toEqual(['longevity'])
    expect(migrated.biomarkers).toEqual([])
    expect(migrated.medications).toEqual([])
    expect(migrated.supplements).toEqual([])
    expect(migrated.variants).toEqual([])
  })

  it('covers every supported profile version in backup round-trip', async () => {
    const { createBiologyBackup, parseBiologyBackup, serializeBiologyBackup } = await import('./biology-backup')
    for (const version of SUPPORTED_BIOLOGY_PROFILE_VERSIONS) {
      const profile = emptyBiologyProfile()
      profile.version = version
      profile.goals = [`v${version}`]
      const backup = await createBiologyBackup(profile)
      const parsed = await parseBiologyBackup(serializeBiologyBackup(backup))
      expect(parsed.profile.version).toBe(version)
      expect(parsed.profile.goals).toEqual([`v${version}`])
      expect(parsed.checksum).toBeTruthy()
    }
  })
})
