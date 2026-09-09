import { describe, expect, it } from 'vitest'
import { emptyBiologyProfile } from './biology-store'
import { buildLongitudinalDashboard } from './longitudinal-dashboard'

describe('longitudinal dashboard', () => {
  it('builds sparkline cards and an evidence overlay from canonical data', () => {
    const dashboard = buildLongitudinalDashboard({
      ...emptyBiologyProfile(),
      biomarkers: [
        { id: 'b1', name: 'CRP', value: 1, unit: 'mg/L', measuredAt: '2026-08-01T00:00:00.000Z', source: 'lab-import' },
        { id: 'b2', name: 'CRP', value: 2, unit: 'mg/L', measuredAt: '2026-08-10T00:00:00.000Z', source: 'lab-import' },
      ],
    }, [{ id: 'doi:1', title: 'CRP review', retrievedAt: '2026-08-05T00:00:00.000Z' }])

    expect(dashboard.cards).toHaveLength(1)
    expect(dashboard.cards[0]?.sparkline.path.startsWith('M ')).toBe(true)
    expect(dashboard.cards[0]?.summary?.direction).toBe('rising')
    expect(dashboard.timeline.map((item) => item.lane)).toEqual(['state', 'evidence', 'state'])
  })
})
