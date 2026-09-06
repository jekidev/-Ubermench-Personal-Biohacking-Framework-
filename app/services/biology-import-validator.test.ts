import { describe, expect, it } from 'vitest'
import { createBiologyBackup } from './biology-backup'
import { validateImportCandidate } from './biology-import-validator'
import { emptyBiologyProfile } from './biology-store'

describe('biology import validator', () => {
  it('accepts a valid import candidate', async () => {
    const current = emptyBiologyProfile()
    current.goals = ['baseline']
    const incoming = emptyBiologyProfile()
    incoming.goals = ['healthspan']
    incoming.biomarkers.push({
      id: 'crp-1',
      name: 'CRP',
      value: 1.1,
      unit: 'mg/L',
      measuredAt: '2026-08-25T08:00:00.000Z',
      source: 'lab-import',
    })
    const backup = await createBiologyBackup(incoming)
    const result = validateImportCandidate(backup, current)
    expect(result.valid).toBe(true)
    expect(result.summary.biomarkerDelta).toBe(1)
    expect(result.checksum).toBeTruthy()
  })

  it('warns when import would clear biomarkers', async () => {
    const current = emptyBiologyProfile()
    current.biomarkers.push({
      id: 'crp-1',
      name: 'CRP',
      value: 1.1,
      unit: 'mg/L',
      measuredAt: '2026-08-25T08:00:00.000Z',
      source: 'lab-import',
    })
    const backup = await createBiologyBackup(emptyBiologyProfile())
    const result = validateImportCandidate(backup, current)
    expect(result.issues.some((issue) => issue.field === 'biomarkers')).toBe(true)
  })
})
