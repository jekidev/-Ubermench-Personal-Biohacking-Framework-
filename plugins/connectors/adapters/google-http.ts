export type GoogleFetch = typeof fetch

export async function googleApiJson<T>(
  url: string,
  token: string,
  init: RequestInit = {},
  fetchImpl: GoogleFetch = fetch,
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetchImpl(url, { ...init, headers })
  const payload = await response.json().catch(() => ({})) as { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Google API failed (${response.status})`)
  }
  return payload as T
}

export async function googleApiBytes(
  url: string,
  token: string,
  fetchImpl: GoogleFetch = fetch,
): Promise<Uint8Array> {
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(payload.error?.message ?? `Google API download failed (${response.status})`)
  }
  return new Uint8Array(await response.arrayBuffer())
}
