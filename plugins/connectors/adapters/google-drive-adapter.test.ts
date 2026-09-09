import { describe, expect, it, vi } from 'vitest'
import { listDriveFiles, searchDriveFiles } from './google-drive-adapter'

vi.mock('../oauth/google-token-store', () => ({
  getValidGoogleAccessToken: vi.fn(async () => 'token-123'),
  loadGoogleCredentials: vi.fn(async () => ({
    clientId: 'id',
    grantedScopes: [],
    connectedServices: ['google-drive'],
  })),
}))

describe('google drive adapter', () => {
  it('lists and searches files with mocked fetch', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      files: [{ id: 'f1', name: 'labs.pdf', mimeType: 'application/pdf' }],
    }), { status: 200 }))
    const listed = await listDriveFiles({ mimeType: 'application/pdf', fetchImpl: fetchImpl as unknown as typeof fetch })
    const searched = await searchDriveFiles('labs', 10, fetchImpl as unknown as typeof fetch)
    expect(listed.files[0]?.name).toBe('labs.pdf')
    expect(searched[0]?.id).toBe('f1')
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain('fullText')
  })
})
