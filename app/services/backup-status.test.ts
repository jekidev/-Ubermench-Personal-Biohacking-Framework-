import { describe, expect, it } from 'vitest'
import { describeBackupStatus, loadBackupStatus, recordBackupExport } from './backup-status'

describe('backup status', () => {
  it('records and reloads export metadata from an injected store', () => {
    const memory = new Map<string, string>()
    const store = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value) },
    }

    const recorded = recordBackupExport({
      lastExportedAt: '2026-09-06T12:00:00.000Z',
      lastChecksumPrefix: 'abc123def456',
      biomarkerCount: 4,
    }, store)

    expect(loadBackupStatus(store)).toEqual(recorded)
    expect(describeBackupStatus(recorded)).toContain('2026-09-06')
    expect(describeBackupStatus(recorded)).toContain('abc123def456')
  })

  it('describes a missing backup without throwing', () => {
    expect(describeBackupStatus(null)).toMatch(/no biology backup/i)
  })
})
