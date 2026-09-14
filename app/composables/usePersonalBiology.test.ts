import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePersonalBiology } from './usePersonalBiology'
import { emptyBiologyProfile, loadBiologyProfile, saveBiologyProfile } from '../services/biology-store'
import { saveBiologyBackupNative } from '../services/biology-backup-native'
import { recordBackupExport } from '../services/backup-status'

vi.mock('../services/biology-store', async (original) => ({
  ...await original<typeof import('../services/biology-store')>(),
  loadBiologyProfile: vi.fn(), saveBiologyProfile: vi.fn(),
}))
vi.mock('../services/biology-backup-native', () => ({ saveBiologyBackupNative: vi.fn(), loadBiologyBackupNative: vi.fn() }))
vi.mock('../services/backup-status', () => ({ recordBackupExport: vi.fn() }))

describe('biology persistence and backup failures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const states = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, initial: () => unknown) => {
      if (!states.has(key)) states.set(key, ref(initial()))
      return states.get(key)
    })
    vi.mocked(loadBiologyProfile).mockResolvedValue({ ...emptyBiologyProfile(), goals: ['preserve'] })
    vi.mocked(saveBiologyProfile).mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('preserves state when a write fails', async () => {
    const biology = usePersonalBiology()
    await biology.initialize()
    vi.mocked(saveBiologyProfile).mockRejectedValue(new Error('disk full'))
    await expect(biology.persist({ ...biology.profile.value, goals: ['new'] })).rejects.toThrow('disk full')
    expect(biology.profile.value.goals).toEqual(['preserve'])
  })

  it('blocks writes and exports after a failed load, and can retry', async () => {
    const biology = usePersonalBiology()
    vi.mocked(loadBiologyProfile).mockRejectedValueOnce(new Error('corrupt storage'))
    await biology.initialize()
    expect(biology.initialized.value).toBe(false)
    await expect(biology.persist(emptyBiologyProfile())).rejects.toThrow('corrupt storage')
    await expect(biology.exportBackup()).rejects.toThrow('corrupt storage')
    expect(saveBiologyProfile).not.toHaveBeenCalled()
    await biology.initialize()
    expect(biology.loadError.value).toBe('')
    expect(biology.profile.value.goals).toEqual(['preserve'])
  })

  it('does not mark a cancelled or failed native export as a backup', async () => {
    const biology = usePersonalBiology()
    await biology.initialize()
    vi.mocked(saveBiologyBackupNative).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('disk full'))
    expect(await biology.exportBackupToFile()).toBeNull()
    await expect(biology.exportBackupToFile()).rejects.toThrow('disk full')
    expect(recordBackupExport).not.toHaveBeenCalled()
    vi.mocked(saveBiologyBackupNative).mockResolvedValue('/backup.json')
    await biology.exportBackupToFile()
    expect(recordBackupExport).toHaveBeenCalledOnce()
  })

  it('creating browser backup bytes does not claim the user saved them', async () => {
    const biology = usePersonalBiology()
    await biology.initialize()
    expect(JSON.parse(await biology.exportBackup()).profile.goals).toEqual(['preserve'])
    await expect(biology.exportEncryptedBackup('')).rejects.toThrow()
    expect(recordBackupExport).not.toHaveBeenCalled()
  })
})
