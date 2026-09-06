import { getValidGoogleAccessToken } from '../oauth/google-token-store'
import { googleApiJson, type GoogleFetch } from './google-http'

export type GmailMessageSummary = {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  internalDate?: string
}

export type GmailMessageDetail = GmailMessageSummary & {
  to: string
  body: string
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

type GmailHeader = { name?: string; value?: string }
type GmailPayload = {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPayload[]
  headers?: GmailHeader[]
}

function headerValue(headers: GmailHeader[], name: string): string {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = typeof atob !== 'undefined' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary')
  try {
    return decodeURIComponent(Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))
  } catch {
    return binary
  }
}

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const binary = String.fromCharCode(...bytes)
  const base64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function extractPlainText(payload?: GmailPayload): string {
  if (!payload) return ''
  if (payload.mimeType?.startsWith('text/plain') && payload.body?.data) return decodeBase64Url(payload.body.data)
  if (payload.parts?.length) {
    for (const part of payload.parts) {
      const text = extractPlainText(part)
      if (text) return text
    }
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data)
  return ''
}

function toSummary(id: string, body: { threadId?: string; snippet?: string; internalDate?: string; payload?: GmailPayload }): GmailMessageSummary {
  const headers = body.payload?.headers ?? []
  return {
    id,
    threadId: String(body.threadId ?? ''),
    subject: headerValue(headers, 'Subject') || '(no subject)',
    from: headerValue(headers, 'From') || 'unknown',
    snippet: String(body.snippet ?? ''),
    internalDate: body.internalDate ? new Date(Number(body.internalDate)).toISOString() : undefined,
  }
}

function buildRfc2822(input: { to: string; subject: string; body: string; from?: string }): string {
  const lines = [
    input.from ? `From: ${input.from}` : undefined,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    input.body,
  ].filter((line): line is string => line !== undefined)
  return lines.join('\r\n')
}

export async function searchGmailThreads(input: {
  query?: string
  limit?: number
  fetchImpl?: GoogleFetch
} = {}): Promise<GmailMessageSummary[]> {
  const token = await getValidGoogleAccessToken(input.fetchImpl)
  const params = new URLSearchParams({ maxResults: String(input.limit ?? 10) })
  if (input.query?.trim()) params.set('q', input.query.trim())
  const listBody = await googleApiJson<{ messages?: Array<{ id?: string }> }>(
    `${GMAIL_API}/messages?${params.toString()}`,
    token,
    {},
    input.fetchImpl,
  )
  const ids = (listBody.messages ?? []).map((item) => item.id).filter((id): id is string => Boolean(id))
  const summaries: GmailMessageSummary[] = []
  for (const id of ids) {
    const body = await googleApiJson<{ threadId?: string; snippet?: string; internalDate?: string; payload?: GmailPayload }>(
      `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      token,
      {},
      input.fetchImpl,
    )
    summaries.push(toSummary(id, body))
  }
  return summaries
}

export async function listGmailMessages(limit = 10, fetchImpl?: GoogleFetch): Promise<GmailMessageSummary[]> {
  return searchGmailThreads({ limit, fetchImpl })
}

export async function readGmailMessage(id: string, fetchImpl?: GoogleFetch): Promise<GmailMessageDetail> {
  if (!id.trim()) throw new Error('Gmail message id is required.')
  const token = await getValidGoogleAccessToken(fetchImpl)
  const body = await googleApiJson<{ threadId?: string; snippet?: string; internalDate?: string; payload?: GmailPayload }>(
    `${GMAIL_API}/messages/${encodeURIComponent(id)}?format=full`,
    token,
    {},
    fetchImpl,
  )
  const headers = body.payload?.headers ?? []
  return {
    ...toSummary(id, body),
    to: headerValue(headers, 'To'),
    body: extractPlainText(body.payload),
  }
}

export async function createGmailDraft(input: {
  to: string
  subject: string
  body: string
  fetchImpl?: GoogleFetch
}): Promise<{ id: string; messageId?: string }> {
  if (!input.to.trim() || !input.subject.trim()) throw new Error('Gmail draft requires to and subject.')
  const token = await getValidGoogleAccessToken(input.fetchImpl)
  const raw = encodeBase64Url(buildRfc2822(input))
  const result = await googleApiJson<{ id?: string; message?: { id?: string } }>(
    `${GMAIL_API}/drafts`,
    token,
    { method: 'POST', body: JSON.stringify({ message: { raw } }) },
    input.fetchImpl,
  )
  return { id: String(result.id ?? ''), messageId: result.message?.id }
}

export async function sendGmailMessage(input: {
  to: string
  subject: string
  body: string
  fetchImpl?: GoogleFetch
}): Promise<{ id: string; threadId?: string }> {
  if (!input.to.trim() || !input.subject.trim()) throw new Error('Gmail send requires to and subject.')
  const token = await getValidGoogleAccessToken(input.fetchImpl)
  const raw = encodeBase64Url(buildRfc2822(input))
  const result = await googleApiJson<{ id?: string; threadId?: string }>(
    `${GMAIL_API}/messages/send`,
    token,
    { method: 'POST', body: JSON.stringify({ raw }) },
    input.fetchImpl,
  )
  return { id: String(result.id ?? ''), threadId: result.threadId }
}
