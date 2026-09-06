import { describe, expect, it } from 'vitest'
import { assessDataQuality, identifyDataGaps } from './data-quality-engine'
import { emptyBiologyProfile } from './biology-store'

describe('data quality engine', () => {
  it('flags empty profiles and missing goals', () => {
    const report = assessDataQuality(emptyBiologyProfile())
    expect(report.completeness).toBe(0)
    expect(report.issues.some((issue) => issue.includes('goals'))).toBe(true)
  })

  it('prioritizes biomarker and goal gaps', () => {
    const gaps = identifyDataGaps(emptyBiologyProfile())
    expect(gaps[0]?.metric).toBe('core biomarkers')
    expect(gaps.some((gap) => gap.metric === 'objective weights')).toBe(true)
  })
})
