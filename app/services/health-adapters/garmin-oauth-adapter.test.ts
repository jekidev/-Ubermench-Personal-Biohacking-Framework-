import { afterEach, describe, expect, it, vi } from 'vitest'
import { lockSecretVault } from '../secret-vault'
import { GarminOAuthAdapter } from './garmin-oauth-adapter'

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

const DAILY_PAYLOAD = {
  provider: 'garmin',
  dailies: [
    { calendarDate: '2026-09-05', restingHeartRate: 54, steps: 6100 },
    { calendarDate: '2026-09-06', restingHeartRate: 52, steps: 8432 },
  ],
}

afterEach(async () => {
  await lockSecretVault()
})

describe('garmin oauth adapter', () => {
  it('requires a Wellness import or vault token before connect', async () => {
    const adapter = new GarminOAuthAdapter({ storage: memoryStorage() })
    await expect(adapter.connect()).rejects.toThrow(/not connected/i)
  })

  it('imports Wellness JSON and never emits a fabricated resting heart rate', async () => {
    const adapter = new GarminOAuthAdapter({ storage: memoryStorage() })
    const imported = await adapter.importWellnessPayload(DAILY_PAYLOAD)
    expect(imported.some((sample) => sample.metric === 'resting_heart_rate' && sample.value === 52)).toBe(true)
    expect(imported.some((sample) => sample.value === 58 && sample.metric === 'resting_heart_rate')).toBe(false)
    expect(imported.every((sample) => typeof sample.metadata?.payloadHash === 'string')).toBe(true)

    await adapter.connect()
    const synced = await adapter.sync()
    expect(synced.map((sample) => sample.id)).toEqual(imported.map((sample) => sample.id))
  })

  it('reuses imported samples across adapter instances from the same storage', async () => {
    const storage = memoryStorage()
    const first = new GarminOAuthAdapter({ storage })
    await first.importWellnessPayload(DAILY_PAYLOAD)

    const second = new GarminOAuthAdapter({ storage })
    await second.connect()
    const synced = await second.sync()
    expect(synced.some((sample) => sample.metric === 'steps' && sample.value === 8432)).toBe(true)
  })

  it('fetches authorized Wellness collections and reports partial failures', async () => {
    const storage = memoryStorage()
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/dailies')) {
        return new Response(JSON.stringify([{ calendarDate: '2026-09-06', restingHeartRate: 50, steps: 1000 }]), { status: 200 })
      }
      if (url.includes('/hrv')) {
        return new Response(JSON.stringify([{ calendarDate: '2026-09-06', lastNightAvg: 41 }]), { status: 200 })
      }
      return new Response('nope', { status: 503 })
    })

    const adapter = new GarminOAuthAdapter({ storage, fetchImpl })
    await adapter.storeTokens('garmin-access-token')
    await adapter.connect()
    const samples = await adapter.sync('2026-09-01T00:00:00.000Z', '2026-09-07T00:00:00.000Z')

    expect(samples.some((sample) => sample.metric === 'resting_heart_rate' && sample.value === 50)).toBe(true)
    expect(samples.some((sample) => sample.metric === 'hrv' && sample.value === 41)).toBe(true)
    expect(JSON.stringify(samples)).not.toContain('garmin-access-token')
    expect(fetchImpl).toHaveBeenCalled()
    const firstUrl = String(fetchImpl.mock.calls[0]?.[0])
    expect(firstUrl).toContain('uploadStartTimeInSeconds=')
  })

  it('does not persist tokens on samples or in local storage caches', async () => {
    const storage = memoryStorage()
    const adapter = new GarminOAuthAdapter({ storage })
    await adapter.storeTokens('super-secret-garmin-token')
    await adapter.importWellnessPayload(DAILY_PAYLOAD)
    const serialized = JSON.stringify([...Array.from({ length: storage.length }, (_, index) => storage.key(index)).map((key) => key ? storage.getItem(key) : null)])
    expect(serialized).not.toContain('super-secret-garmin-token')
  })
})
