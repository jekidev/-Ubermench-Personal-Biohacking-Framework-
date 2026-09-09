import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGmailDraft, searchGmailThreads, sendGmailMessage } from './gmail-adapter'

vi.mock('../oauth/google-token-store', () => ({
  getValidGoogleAccessToken: vi.fn(async () => 'token-123'),
}))

describe('gmail adapter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('searches messages with mocked fetch', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/messages?')) {
        return new Response(JSON.stringify({ messages: [{ id: 'm1' }] }), { status: 200 })
      }
      return new Response(JSON.stringify({
        threadId: 't1',
        snippet: 'lab result',
        payload: { headers: [{ name: 'Subject', value: 'Bloods' }, { name: 'From', value: 'lab@example.com' }] },
      }), { status: 200 })
    })
    const results = await searchGmailThreads({ query: 'bloods', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(results).toEqual([expect.objectContaining({ id: 'm1', subject: 'Bloods', from: 'lab@example.com' })])
  })

  it('creates drafts and sends through Gmail endpoints', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/drafts')) {
        expect(init?.method).toBe('POST')
        return new Response(JSON.stringify({ id: 'd1', message: { id: 'm1' } }), { status: 200 })
      }
      if (String(url).endsWith('/messages/send')) {
        return new Response(JSON.stringify({ id: 's1', threadId: 't1' }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    })
    const draft = await createGmailDraft({ to: 'a@b.com', subject: 'Hi', body: 'Hello', fetchImpl: fetchImpl as unknown as typeof fetch })
    const sent = await sendGmailMessage({ to: 'a@b.com', subject: 'Hi', body: 'Hello', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(draft.id).toBe('d1')
    expect(sent.id).toBe('s1')
  })
})
