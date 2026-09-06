import { describe, expect, it } from 'vitest'
import { GarminOAuthAdapter } from './garmin-oauth-adapter'

describe('garmin oauth adapter', () => {
  it('requires configuration before connect', async () => {
    const adapter = new GarminOAuthAdapter()
    await expect(adapter.connect()).rejects.toThrow(/not configured/i)
  })
})
