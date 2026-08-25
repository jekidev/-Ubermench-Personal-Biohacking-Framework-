import { describe, expect, it } from 'vitest'
import { assertTauriRuntime } from './biology-backup-native'

describe('native biology backup', () => {
  it('requires the Tauri runtime before opening native dialogs', () => {
    expect(() => assertTauriRuntime()).toThrow(/Tauri desktop application/)
  })
})
