import { describe, expect, it } from 'vitest'
import { parseGoogleClientSecretJson } from './google-client-json'

describe('google client json', () => {
  it('parses web client credentials', () => {
    const parsed = parseGoogleClientSecretJson(JSON.stringify({
      web: {
        client_id: 'abc.apps.googleusercontent.com',
        client_secret: 'secret',
        project_id: 'proj',
      },
    }))
    expect(parsed.clientId).toBe('abc.apps.googleusercontent.com')
    expect(parsed.clientSecret).toBe('secret')
    expect(parsed.projectId).toBe('proj')
  })
})
