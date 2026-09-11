import { describe, expect, it } from 'vitest'
import { emptyBiologyProfile } from './biology-store'
import { buildOverviewSummary, latestExperiment } from './overview-dashboard'

describe('overview dashboard helpers', () => {
  it('summarises empty data quality, experiments and safety', () => {
    const summary = buildOverviewSummary({
      profile: emptyBiologyProfile(),
      experiments: [],
      safetyFlags: [],
      backup: null,
    })
    expect(summary.qualityPercent).toBe(0)
    expect(summary.topGap?.metric).toBe('core biomarkers')
    expect(summary.experimentCount).toBe(0)
    expect(summary.latestConclusion).toBeUndefined()
    expect(summary.safetySeverity).toBe('green')
    expect(summary.navigation.some((item) => item.to === '/data-health')).toBe(true)
    expect(summary.navigation.some((item) => item.to === '/safety')).toBe(true)
    expect(summary.navigation.some((item) => item.to === '/longevity/fitness')).toBe(true)
    expect(summary.navigation.some((item) => item.to === '/settings?tab=plugins')).toBe(true)
    expect(summary.backupNote).toMatch(/no biology backup/i)
  })

  it('selects the latest experiment conclusion without mixing safety into ranking', () => {
    const latest = latestExperiment([
      { id: 'old', intervention: 'creatine', startAt: '2026-01-01T00:00:00.000Z' },
      { id: 'new', intervention: 'magnesium', startAt: '2026-09-01T00:00:00.000Z', runtime: { status: 'running' } },
    ])
    expect(latest?.id).toBe('new')

    const summary = buildOverviewSummary({
      profile: { ...emptyBiologyProfile(), goals: ['sleep'] },
      experiments: [
        { id: 'new', intervention: 'magnesium', metric: 'hrv', startAt: '2026-09-01T00:00:00.000Z', runtime: { status: 'running' } },
      ],
      summarizeExperiment: () => ({
        conclusionType: 'association',
        conclusionRationale: 'Insufficient paired observations for within-person inference.',
      }),
      safetyFlags: [{
        severity: 'orange',
        code: 'CUMULATIVE_DOSE',
        title: 'Cumulative dose: magnesium',
        detail: 'Review cumulative dose.',
        requiresReview: true,
      }],
    })

    expect(summary.experimentCount).toBe(1)
    expect(summary.latestConclusion?.conclusionType).toBe('association')
    expect(summary.safetyReviewCount).toBe(1)
    expect(summary.safetySeverity).toBe('orange')
  })
})
