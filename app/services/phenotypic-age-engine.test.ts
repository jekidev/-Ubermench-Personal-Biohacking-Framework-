import { describe, expect, it } from 'vitest'
import { computePhenotypicAge } from './phenotypic-age-engine'

describe('phenotypic age engine', () => {
  it('returns null when required markers are missing', () => {
    const result = computePhenotypicAge({ chronologicalAgeYears: 35, albumin_g_per_L: 40 })
    expect(result.phenotypicAgeYears).toBeNull()
    expect(result.missingMarkers.length).toBeGreaterThan(0)
  })

  it('computes an age estimate when all markers are present', () => {
    const result = computePhenotypicAge({
      chronologicalAgeYears: 35,
      albumin_g_per_L: 42,
      creatinine_umol_per_L: 80,
      glucose_mmol_per_L: 5.2,
      crp_mg_per_L: 1.2,
      lymphocyte_percent: 30,
      mcv_fL: 90,
      rdw_ratio: 13,
      alp_U_per_L: 70,
      wbc_10e9_per_L: 6.5,
    })
    expect(result.phenotypicAgeYears).toBeTypeOf('number')
    expect(result.ageDeltaYears).toBeTypeOf('number')
    expect(result.missingMarkers).toHaveLength(0)
  })
})
