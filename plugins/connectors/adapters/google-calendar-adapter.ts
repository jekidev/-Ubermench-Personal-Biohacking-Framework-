import { getValidGoogleAccessToken } from '../oauth/google-token-store'
import { googleApiJson, type GoogleFetch } from './google-http'

export type CalendarSummary = {
  id: string
  summary: string
  primary?: boolean
  timeZone?: string
}

export type CalendarEvent = {
  id: string
  calendarId: string
  summary: string
  description?: string
  start?: string
  end?: string
  htmlLink?: string
  status?: string
}

export type FreeSlot = {
  start: string
  end: string
  durationMinutes: number
}

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

function eventTime(value?: { dateTime?: string; date?: string }): string | undefined {
  return value?.dateTime ?? value?.date
}

function toEvent(calendarId: string, item: {
  id?: string
  summary?: string
  description?: string
  htmlLink?: string
  status?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}): CalendarEvent {
  return {
    id: String(item.id ?? ''),
    calendarId,
    summary: item.summary ?? '(no title)',
    description: item.description,
    start: eventTime(item.start),
    end: eventTime(item.end),
    htmlLink: item.htmlLink,
    status: item.status,
  }
}

export async function listCalendars(fetchImpl?: GoogleFetch): Promise<CalendarSummary[]> {
  const token = await getValidGoogleAccessToken(fetchImpl)
  const body = await googleApiJson<{ items?: Array<{ id?: string; summary?: string; primary?: boolean; timeZone?: string }> }>(
    `${CALENDAR_API}/users/me/calendarList`,
    token,
    {},
    fetchImpl,
  )
  return (body.items ?? [])
    .filter((item) => item.id)
    .map((item) => ({
      id: String(item.id),
      summary: item.summary ?? item.id ?? 'Calendar',
      primary: item.primary,
      timeZone: item.timeZone,
    }))
}

export async function listCalendarEvents(input: {
  calendarId?: string
  timeMin?: string
  timeMax?: string
  query?: string
  limit?: number
  fetchImpl?: GoogleFetch
} = {}): Promise<CalendarEvent[]> {
  const token = await getValidGoogleAccessToken(input.fetchImpl)
  const calendarId = encodeURIComponent(input.calendarId?.trim() || 'primary')
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(input.limit ?? 25),
  })
  if (input.timeMin) params.set('timeMin', input.timeMin)
  if (input.timeMax) params.set('timeMax', input.timeMax)
  if (input.query?.trim()) params.set('q', input.query.trim())
  const body = await googleApiJson<{ items?: Array<Parameters<typeof toEvent>[1]> }>(
    `${CALENDAR_API}/calendars/${calendarId}/events?${params.toString()}`,
    token,
    {},
    input.fetchImpl,
  )
  return (body.items ?? []).map((item) => toEvent(input.calendarId?.trim() || 'primary', item))
}

export async function createCalendarEvent(input: {
  calendarId?: string
  summary: string
  description?: string
  start: string
  end: string
  timeZone?: string
  fetchImpl?: GoogleFetch
}): Promise<CalendarEvent> {
  if (!input.summary.trim() || !input.start || !input.end) {
    throw new Error('Calendar create requires summary, start, and end.')
  }
  const token = await getValidGoogleAccessToken(input.fetchImpl)
  const calendarId = encodeURIComponent(input.calendarId?.trim() || 'primary')
  const allDay = !input.start.includes('T')
  const payload = {
    summary: input.summary.trim(),
    description: input.description,
    start: allDay ? { date: input.start } : { dateTime: input.start, timeZone: input.timeZone },
    end: allDay ? { date: input.end } : { dateTime: input.end, timeZone: input.timeZone },
  }
  const body = await googleApiJson<Parameters<typeof toEvent>[1]>(
    `${CALENDAR_API}/calendars/${calendarId}/events`,
    token,
    { method: 'POST', body: JSON.stringify(payload) },
    input.fetchImpl,
  )
  return toEvent(input.calendarId?.trim() || 'primary', body)
}

export async function updateCalendarEvent(input: {
  calendarId?: string
  eventId: string
  summary?: string
  description?: string
  start?: string
  end?: string
  timeZone?: string
  fetchImpl?: GoogleFetch
}): Promise<CalendarEvent> {
  if (!input.eventId.trim()) throw new Error('Calendar update requires eventId.')
  const token = await getValidGoogleAccessToken(input.fetchImpl)
  const calendarId = encodeURIComponent(input.calendarId?.trim() || 'primary')
  const patch: Record<string, unknown> = {}
  if (input.summary) patch.summary = input.summary
  if (input.description !== undefined) patch.description = input.description
  if (input.start) patch.start = input.start.includes('T') ? { dateTime: input.start, timeZone: input.timeZone } : { date: input.start }
  if (input.end) patch.end = input.end.includes('T') ? { dateTime: input.end, timeZone: input.timeZone } : { date: input.end }
  const body = await googleApiJson<Parameters<typeof toEvent>[1]>(
    `${CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(input.eventId)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(patch) },
    input.fetchImpl,
  )
  return toEvent(input.calendarId?.trim() || 'primary', body)
}

export async function deleteCalendarEvent(input: {
  calendarId?: string
  eventId: string
  fetchImpl?: GoogleFetch
}): Promise<{ deleted: true; eventId: string }> {
  if (!input.eventId.trim()) throw new Error('Calendar delete requires eventId.')
  const token = await getValidGoogleAccessToken(input.fetchImpl)
  const calendarId = encodeURIComponent(input.calendarId?.trim() || 'primary')
  const url = `${CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(input.eventId)}`
  const response = await (input.fetchImpl ?? fetch)(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(payload.error?.message ?? `Calendar delete failed (${response.status})`)
  }
  return { deleted: true, eventId: input.eventId }
}

export function suggestFreeSlots(input: {
  events: CalendarEvent[]
  windowStart: string
  windowEnd: string
  durationMinutes: number
  limit?: number
}): FreeSlot[] {
  const durationMs = Math.max(input.durationMinutes, 15) * 60_000
  const windowStart = Date.parse(input.windowStart)
  const windowEnd = Date.parse(input.windowEnd)
  if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd) || windowEnd <= windowStart) {
    throw new Error('Free-time window requires valid start and end.')
  }
  const busy = input.events
    .map((event) => ({ start: Date.parse(event.start ?? ''), end: Date.parse(event.end ?? '') }))
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((a, b) => a.start - b.start)

  const slots: FreeSlot[] = []
  let cursor = windowStart
  for (const range of busy) {
    if (range.start - cursor >= durationMs) {
      slots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(range.start).toISOString(),
        durationMinutes: Math.floor((range.start - cursor) / 60_000),
      })
    }
    cursor = Math.max(cursor, range.end)
    if (slots.length >= (input.limit ?? 5)) return slots
  }
  if (windowEnd - cursor >= durationMs && slots.length < (input.limit ?? 5)) {
    slots.push({
      start: new Date(cursor).toISOString(),
      end: new Date(windowEnd).toISOString(),
      durationMinutes: Math.floor((windowEnd - cursor) / 60_000),
    })
  }
  return slots
}

export async function suggestCalendarFreeTime(input: {
  calendarId?: string
  windowStart: string
  windowEnd: string
  durationMinutes: number
  limit?: number
  fetchImpl?: GoogleFetch
}): Promise<FreeSlot[]> {
  const events = await listCalendarEvents({
    calendarId: input.calendarId,
    timeMin: input.windowStart,
    timeMax: input.windowEnd,
    limit: 100,
    fetchImpl: input.fetchImpl,
  })
  return suggestFreeSlots({
    events,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    durationMinutes: input.durationMinutes,
    limit: input.limit,
  })
}
