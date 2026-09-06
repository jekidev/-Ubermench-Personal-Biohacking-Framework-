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
})
