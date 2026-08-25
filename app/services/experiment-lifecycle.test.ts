import { describe, expect, it } from 'vitest'
import { annotateExperimentObservations, buildExperimentWindows } from './experiment-lifecycle'

describe('experiment-lifecycle', () => {
  it('creates ordered phases', () => {
    const windows = buildExperimentWindows({ id: 'e1', subjectId: 's1', metric: 'hrv', intervention: 'x', baselineDays: 2, interventionDays: 3, washoutDays: 1, followupDays: 2, startAt: '2026-08-01T00:00:00Z' })
    expect(windows.map((item) => item.phase)).toEqual(['baseline', 'washout', 'intervention', 'followup'])
  })

  it('annotates observations with experiment phase', () => {
    const observations = [{ id: 'o1', subjectId: 's1', observedAt: '2026-08-02T12:00:00Z', metric: 'hrv', value: 55, unit: 'ms', source: 'wearable', quality: 1, confidence: 0.9 }]
    const [annotated] = annotateExperimentObservations(observations, { id: 'e1', subjectId: 's1', metric: 'hrv', intervention: 'x', baselineDays: 2, interventionDays: 3, washoutDays: 1, followupDays: 2, startAt: '2026-08-01T00:00:00Z' })
    expect(annotated?.context?.experimentId).toBe('e1')
    expect(annotated?.context?.phase).toBe('baseline')
  })
})
