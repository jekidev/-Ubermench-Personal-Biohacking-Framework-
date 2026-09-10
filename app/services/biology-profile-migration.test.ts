import { describe, expect, it } from 'vitest'
import { migrateBiologyProfile, SUPPORTED_BIOLOGY_PROFILE_VERSIONS } from './biology-profile-migration'
import { emptyBiologyProfile } from './biology-store'
import type { PersonalBiologyProfile } from '~/types/biology'

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

  describe('comprehensive migration path coverage', () => {
    it('preserves all v1 arrays during normalization', () => {
      const v1Input = {
        version: 1,
        biomarkers: [{ id: '1', name: 'ldl', value: 90, unit: 'mg/dL', measuredAt: '2026-01-01', source: 'lab-import' as const }],
        variants: [{ id: '1', gene: 'APOE', genotype: 'e3/e4', source: 'genomics-import' as const }],
        medications: [{ id: '1', name: 'aspirin', dose: '81mg', active: true, startedAt: '2026-01-01' }],
        supplements: [{ id: '1', name: 'd3', dose: '2000iu', active: true }],
        symptoms: [{ id: '1', name: 'fatigue', severity: 2, recordedAt: '2026-01-01' }],
        sleep: [{ id: '1', recordedAt: '2026-01-01', durationMinutes: 450, efficiency: 0.85, source: 'wearable' as const }],
        training: [{ id: '1', recordedAt: '2026-01-01', activity: 'strength', durationMinutes: 45 }],
        goals: ['longevity', 'performance'],
        updatedAt: '2026-01-01T12:00:00.000Z',
      }
      const migrated = migrateBiologyProfile(v1Input)
      expect(migrated.version).toBe(1)
      expect(migrated.biomarkers).toHaveLength(1)
      expect(migrated.biomarkers[0]?.name).toBe('ldl')
      expect(migrated.variants).toHaveLength(1)
      expect(migrated.variants[0]?.gene).toBe('APOE')
      expect(migrated.medications).toHaveLength(1)
      expect(migrated.medications[0]?.name).toBe('aspirin')
      expect(migrated.supplements).toHaveLength(1)
      expect(migrated.supplements[0]?.name).toBe('d3')
      expect(migrated.symptoms).toHaveLength(1)
      expect(migrated.sleep).toHaveLength(1)
      expect(migrated.training).toHaveLength(1)
      expect(migrated.goals).toEqual(['longevity', 'performance'])
      expect(migrated.updatedAt).toBe('2026-01-01T12:00:00.000Z')
    })

    it('handles v1 profiles with corrupt or missing updatedAt', () => {
      const migrated = migrateBiologyProfile({ version: 1, updatedAt: null })
      expect(migrated.updatedAt).toBeTruthy()
      expect(migrated.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
    })

    it('filters non-string items from v1 goals array', () => {
      const migrated = migrateBiologyProfile({
        version: 1,
        goals: ['longevity', null, 42, 'healthspan', undefined, {}],
      })
      expect(migrated.goals).toEqual(['longevity', 'healthspan'])
    })

    it('coerces non-array v1 fields to empty arrays', () => {
      const migrated = migrateBiologyProfile({
        version: 1,
        biomarkers: 'not-an-array',
        variants: null,
        medications: 42,
        supplements: {},
        symptoms: undefined,
        sleep: false,
        training: true,
      })
      expect(migrated.biomarkers).toEqual([])
      expect(migrated.variants).toEqual([])
      expect(migrated.medications).toEqual([])
      expect(migrated.supplements).toEqual([])
      expect(migrated.symptoms).toEqual([])
      expect(migrated.sleep).toEqual([])
      expect(migrated.training).toEqual([])
    })

    it('validates migration idempotence', () => {
      const original = emptyBiologyProfile()
      original.goals = ['longevity']
      original.biomarkers.push({ id: 'b1', name: 'glucose', value: 95, unit: 'mg/dL', measuredAt: '2026-01-01', source: 'lab-import' })
      
      const firstPass = migrateBiologyProfile(original)
      const secondPass = migrateBiologyProfile(firstPass)
      
      expect(firstPass).toEqual(secondPass)
    })

    it('ensures every supported version has a normalization path', () => {
      for (const version of SUPPORTED_BIOLOGY_PROFILE_VERSIONS) {
        const minimal = { version, updatedAt: '2026-01-01T00:00:00.000Z' }
        expect(() => migrateBiologyProfile(minimal)).not.toThrow()
        const result = migrateBiologyProfile(minimal)
        expect(result.version).toBe(version)
        expect(result.biomarkers).toEqual([])
        expect(result.medications).toEqual([])
        expect(result.goals).toEqual([])
      }
    })

    it('rejects profiles missing version field', () => {
      expect(() => migrateBiologyProfile({ goals: ['test'] })).toThrow(/unsupported/i)
    })

    it('rejects profiles with string version field', () => {
      expect(() => migrateBiologyProfile({ version: '1' })).toThrow(/unsupported/i)
    })

    it('handles large v1 biomarker arrays efficiently', () => {
      const largeBiomarkers = Array.from({ length: 500 }, (_, i) => ({
        id: `b${i}`,
        name: `marker${i}`,
        value: i * 10,
        unit: 'unit',
        measuredAt: '2026-01-01',
        source: 'manual' as const,
      }))
      const migrated = migrateBiologyProfile({
        version: 1,
        biomarkers: largeBiomarkers,
      })
      expect(migrated.biomarkers).toHaveLength(500)
      expect(migrated.biomarkers[499]?.name).toBe('marker499')
    })
  })

  describe('forward migration scaffolding', () => {
    it('documents expected behavior when v2 is added', () => {
      // This test will fail when version 2 is added to SUPPORTED_BIOLOGY_PROFILE_VERSIONS
      // Remove this test and add proper v1->v2 migration tests at that time
      expect(SUPPORTED_BIOLOGY_PROFILE_VERSIONS).toHaveLength(1)
      expect(SUPPORTED_BIOLOGY_PROFILE_VERSIONS[0]).toBe(1)
    })

    it('validates that migration preserves profile contract', () => {
      const input: PersonalBiologyProfile = {
        version: 1,
        biomarkers: [{ id: 'b1', name: 'test', value: 100, unit: 'mg/dL', measuredAt: '2026-01-01', source: 'manual' }],
        variants: [],
        medications: [],
        supplements: [],
        symptoms: [],
        sleep: [],
        training: [],
        goals: ['test-goal'],
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const output = migrateBiologyProfile(input)
      
      // Ensure output conforms to PersonalBiologyProfile type
      const _typeCheck: PersonalBiologyProfile = output
      expect(output.version).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(output.biomarkers)).toBe(true)
      expect(Array.isArray(output.variants)).toBe(true)
      expect(Array.isArray(output.medications)).toBe(true)
      expect(Array.isArray(output.supplements)).toBe(true)
      expect(Array.isArray(output.symptoms)).toBe(true)
      expect(Array.isArray(output.sleep)).toBe(true)
      expect(Array.isArray(output.training)).toBe(true)
      expect(Array.isArray(output.goals)).toBe(true)
      expect(typeof output.updatedAt).toBe('string')
    })
  })

  describe('backup integration', () => {
    it('validates that migration handles backup restore correctly', async () => {
      const { createBiologyBackup, parseBiologyBackup, serializeBiologyBackup } = await import('./biology-backup')
      const { validateImportCandidate } = await import('./biology-import-validator')
      
      const original = emptyBiologyProfile()
      original.biomarkers.push({ id: 'b1', name: 'hdl', value: 60, unit: 'mg/dL', measuredAt: '2026-01-01', source: 'lab-import' })
      original.medications.push({ id: 'm1', name: 'med1', dose: '10mg', active: true, startedAt: '2026-01-01' })
      original.goals = ['healthspan', 'cognition']
      
      const backup = await createBiologyBackup(original)
      const serialized = serializeBiologyBackup(backup)
      const parsed = await parseBiologyBackup(serialized)
      
      // parseBiologyBackup returns BiologyBackup, not validation result
      expect(parsed.profile.biomarkers).toHaveLength(1)
      expect(parsed.profile.biomarkers[0]?.name).toBe('hdl')
      expect(parsed.profile.medications).toHaveLength(1)
      expect(parsed.profile.goals).toEqual(['healthspan', 'cognition'])
      
      // Validate that import candidate processing works
      const validation = validateImportCandidate(parsed, emptyBiologyProfile())
      expect(validation.valid).toBe(true)
      expect(validation.incoming.biomarkers).toHaveLength(1)
    })

    it('ensures migration errors do not corrupt backup validation', async () => {
      const { parseBiologyBackup } = await import('./biology-backup')
      
      const invalidBackup = JSON.stringify({
        format: 'ubermench-biology-backup',
        version: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        profile: { version: 999 }, // unsupported version
        metadata: {},
        checksum: 'invalid',
      })
      
      await expect(parseBiologyBackup(invalidBackup)).rejects.toThrow()
    })
  })
})
