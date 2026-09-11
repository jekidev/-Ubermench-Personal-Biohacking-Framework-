import { describe, expect, it, beforeEach } from 'vitest'
import { getConnectorStatus, listConnectorStatuses } from './connector-runtime'
import { setConnectorEnabled } from './connector-store'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('connector runtime', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
  })

  it('returns status snapshots for all connectors', async () => {
    const statuses = await listConnectorStatuses()
    expect(statuses.length).toBeGreaterThan(10)
    expect(statuses.find((item) => item.id === 'gmail')?.implementationStatus).toBe('live')
    expect(statuses.find((item) => item.id === 'google-calendar')?.implementationStatus).toBe('live')
  })

  it('treats PaperQA as a local contract without an MCP spawn target', async () => {
    setConnectorEnabled('paper-qa', true)
    const status = await getConnectorStatus('paper-qa')
    expect(status.status).toBe('connected')
    expect(status.implementationStatus).toBe('scaffold')
  })

  it('marks MCP research sidecars as configured when enabled without env keys', async () => {
    setConnectorEnabled('paper-search', true)
    const paperSearch = await getConnectorStatus('paper-search')
    expect(paperSearch.status).toBe('missing-credentials')
    expect(paperSearch.missing).toContain('PAPER_SEARCH_MCP_UNPAYWALL_EMAIL')

    setConnectorEnabled('local-deep-research', true)
    const localDeepResearch = await getConnectorStatus('local-deep-research')
    expect(localDeepResearch.status).toBe('missing-credentials')
    expect(localDeepResearch.missing).toContain('LDR_LLM_PROVIDER')
  })
})
