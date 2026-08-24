import { describe, expect, it } from 'vitest'
import { DEFAULT_LLM_SETTINGS, hasConfiguredProvider } from './settings'

describe('LLM settings', () => {
  it('defaults to free-only rotation', () => {
    expect(DEFAULT_LLM_SETTINGS.autoFreeOnly).toBe(true)
  })

  it('tracks provider configuration without storing the secret value', () => {
    expect(hasConfiguredProvider({ ...DEFAULT_LLM_SETTINGS, manuallyConfigured: { openai: true } }, 'openai')).toBe(true)
  })
})
