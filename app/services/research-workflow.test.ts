import { describe, expect, it } from 'vitest'
import { setConnectorEnabled } from '../../plugins/connectors/connector-store'
import { buildResearchQuery } from './research-engine'
import { getResearchProvider } from './external-research-providers'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('research integration', () => {
  it('builds a literature-only external research query', () => {
    expect(buildResearchQuery('inflammation')).toBe('(inflammation)')
    expect(buildResearchQuery('inflammation')).not.toContain('CRP')
  })

  it('exposes permissive and local research provider capabilities without enabling unconfigured adapters', () => {
    const storage = new MemoryStorage()
    expect(getResearchProvider('europe-pmc', storage)?.enabled).toBe(true)
    expect(getResearchProvider('paper-qa', storage)?.enabled).toBe(false)
    expect(getResearchProvider('local-deep-research', storage)?.requiresLocalRuntime).toBe(true)
  })

  it('reflects connector enablement for starred research adapters', () => {
    const storage = new MemoryStorage()
    setConnectorEnabled('paper-search', true, storage)
    expect(getResearchProvider('paper-search', storage)?.enabled).toBe(true)
  })
})
