import { getValidGoogleAccessToken } from '../oauth/google-token-store'

export type GmailMessageSummary = {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  internalDate?: string
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export async function listGmailMessages(limit = 10): Promise<GmailMessageSummary[]> {
  const token = await getValidGoogleAccessToken()
  const listResponse = await fetch(`${GMAIL_API}/messages?maxResults=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const listBody = await listResponse.json().catch(() => ({}))
  if (!listResponse.ok) throw new Error(listBody?.error?.message ?? 'Gmail list failed')

  const ids = Array.isArray(listBody.messages)
    ? listBody.messages.map((item: { id?: string }) => item.id).filter(Boolean) as string[]
    : []

  const summaries: GmailMessageSummary[] = []
  for (const id of ids) {
    const response = await fetch(`${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) continue
    const headers = Array.isArray(body.payload?.headers) ? body.payload.headers as Array<{ name?: string; value?: string }> : []
    summaries.push({
      id,
      threadId: String(body.threadId ?? ''),
      subject: headers.find((header) => header.name === 'Subject')?.value ?? '(no subject)',
      from: headers.find((header) => header.name === 'From')?.value ?? 'unknown',
      snippet: String(body.snippet ?? ''),
      internalDate: body.internalDate ? new Date(Number(body.internalDate)).toISOString() : undefined,
    })
  }
  return summaries
}
