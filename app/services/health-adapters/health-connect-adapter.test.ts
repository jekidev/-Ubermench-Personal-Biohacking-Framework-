import { describe, expect, it, vi } from 'vitest'
import { detectHealthConnectRuntimeMode, HealthConnectAdapter } from './health-connect-adapter'

describe('health connect adapter', () => {
  it('blocks browser runtime on Android user agent', async () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' })
    expect(await detectHealthConnectRuntimeMode()).toBe('browser-blocked')
    const adapter = new HealthConnectAdapter()
    await expect(adapter.connect()).rejects.toThrow(/Android app/)
    vi.unstubAllGlobals()
  })
})
