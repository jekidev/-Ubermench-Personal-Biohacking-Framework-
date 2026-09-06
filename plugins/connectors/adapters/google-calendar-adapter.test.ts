import { describe, expect, it, vi } from 'vitest'
import { createCalendarEvent, listCalendarEvents, suggestFreeSlots } from './google-calendar-adapter'

vi.mock('../oauth/google-token-store', () => ({
  getValidGoogleAccessToken: vi.fn(async () => 'token-123'),
}))

describe('google calendar adapter', () => {
  it('lists and creates events with mocked fetch', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({
          id: 'e2',
          summary: 'Blood draw',
          start: { dateTime: '2026-09-07T09:00:00.000Z' },
          end: { dateTime: '2026-09-07T09:30:00.000Z' },
        }), { status: 200 })
      }
      return new Response(JSON.stringify({
        items: [{
          id: 'e1',
          summary: 'Existing',
          start: { dateTime: '2026-09-07T08:00:00.000Z' },
          end: { dateTime: '2026-09-07T08:30:00.000Z' },
        }],
      }), { status: 200 })
    })
    const events = await listCalendarEvents({ fetchImpl: fetchImpl as unknown as typeof fetch })
    const created = await createCalendarEvent({
      summary: 'Blood draw',
      start: '2026-09-07T09:00:00.000Z',
      end: '2026-09-07T09:30:00.000Z',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(events[0]?.id).toBe('e1')
    expect(created.summary).toBe('Blood draw')
  })

  it('suggests free slots between busy events', () => {
    const slots = suggestFreeSlots({
      events: [{
        id: 'busy',
        calendarId: 'primary',
        summary: 'Busy',
        start: '2026-09-07T10:00:00.000Z',
        end: '2026-09-07T11:00:00.000Z',
      }],
      windowStart: '2026-09-07T09:00:00.000Z',
      windowEnd: '2026-09-07T13:00:00.000Z',
      durationMinutes: 30,
    })
    expect(slots[0]?.start).toBe('2026-09-07T09:00:00.000Z')
    expect(slots.some((slot) => slot.start === '2026-09-07T11:00:00.000Z')).toBe(true)
  })
})
