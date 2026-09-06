import { describe, expect, it } from 'vitest'
import { createPkcePair, googleTokenExpiryIso, isGoogleTokenExpired } from './google-oauth'

describe('google oauth', () => {
  it('creates PKCE verifier and challenge', async () => {
    const pair = await createPkcePair()
    expect(pair.verifier.length).toBeGreaterThan(20)
    expect(pair.challenge).not.toEqual(pair.verifier)
  })

  it('detects token expiry', () => {
    expect(isGoogleTokenExpired(undefined)).toBe(true)
    expect(isGoogleTokenExpired(googleTokenExpiryIso(3600))).toBe(false)
    expect(isGoogleTokenExpired(new Date(Date.now() - 1000).toISOString())).toBe(true)
  })

  it('expiry iso is in the future', () => {
    const iso = googleTokenExpiryIso(120)
    expect(Date.parse(iso)).toBeGreaterThan(Date.now())
  })
})
