import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lockSecretVault } from '../secret-vault'
import {
  buildGarminAuthorizeUrl,
  clearGarminOAuthState,
  completeGarminOAuth,
  exchangeGarminAuthCode,
  GARMIN_AUTH_URL,
  loadGarminOAuthState,
  saveGarminClientId,
  saveGarminClientSecret,
} from './garmin-oauth-flow'
import { GARMIN_TOKEN_KEY } from './garmin-oauth-adapter'
import { getSecret } from '../secret-vault'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)) },
    removeItem: (key) => { values.delete(key) },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size },
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'sessionStorage', { value: memoryStorage(), configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
  vi.stubGlobal('crypto', {
    ...globalThis.crypto,
    randomUUID: () => 'state-uuid',
    getRandomValues: (array: Uint8Array) => {
      array.fill(7)
      return array
    },
    subtle: globalThis.crypto?.subtle,
  })
})

afterEach(async () => {
  clearGarminOAuthState()
  await lockSecretVault()
  vi.unstubAllGlobals()
})

describe('garmin oauth flow', () => {
  it('builds an authorize URL and stores PKCE state', async () => {
    await saveGarminClientId('garmin-client-id')
    const url = await buildGarminAuthorizeUrl({
      redirectUri: 'http://localhost:3000/health-sync/oauth/callback',
      storage: memoryStorage(),
    })
    expect(url.startsWith(GARMIN_AUTH_URL)).toBe(true)
    expect(url).toContain('client_id=garmin-client-id')
    expect(url).toContain('code_challenge=')
    expect(loadGarminOAuthState(memoryStorage())?.redirectUri).toBe('http://localhost:3000/health-sync/oauth/callback')
  })

  it('exchanges an authorization code for vault-stored tokens', async () => {
    await saveGarminClientId('garmin-client-id')
    await saveGarminClientSecret('garmin-client-secret')
    await buildGarminAuthorizeUrl({
      redirectUri: 'http://localhost:3000/health-sync/oauth/callback',
    })

    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      access_token: 'garmin-access-token',
      refresh_token: 'garmin-refresh-token',
      expires_in: 86400,
      token_type: 'bearer',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchImpl)

    const exchanged = await exchangeGarminAuthCode({
      code: 'auth-code',
      clientId: 'garmin-client-id',
      clientSecret: 'garmin-client-secret',
      redirectUri: 'http://localhost:3000/health-sync/oauth/callback',
      codeVerifier: loadGarminOAuthState()!.codeVerifier,
      fetchImpl,
    })
    expect(exchanged.access_token).toBe('garmin-access-token')

    const completed = await completeGarminOAuth('auth-code')
    expect(completed.access_token).toBe('garmin-access-token')
    expect(await getSecret(GARMIN_TOKEN_KEY)).toBe('garmin-access-token')
    expect(loadGarminOAuthState()).toBeNull()
  })
})
