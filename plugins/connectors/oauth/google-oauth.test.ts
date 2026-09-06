import { describe, expect, it } from 'vitest'
import {
  createPkcePair,
  googleTokenExpiryIso,
  isGoogleTokenExpired,
  loadOAuthState,
  saveOAuthState,
  scopesCoverConnector,
  scopesForConnectors,
} from './google-oauth'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

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

  it('unions scopes for selected Google services', () => {
    const scopes = scopesForConnectors(['gmail', 'google-calendar'])
    expect(scopes).toContain('https://www.googleapis.com/auth/gmail.send')
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar')
    expect(scopesCoverConnector(scopes, 'gmail')).toBe(true)
    expect(scopesCoverConnector(scopes, 'google-drive')).toBe(false)
  })

  it('persists oauth state helpers', () => {
    const storage = new MemoryStorage()
    saveOAuthState({
      connectorIds: ['gmail'],
      codeVerifier: 'verifier',
      redirectUri: 'http://localhost:3000/connectors/oauth/callback',
      createdAt: '2026-01-01T00:00:00.000Z',
    }, storage)
    expect(loadOAuthState(storage)?.codeVerifier).toBe('verifier')
  })
})
