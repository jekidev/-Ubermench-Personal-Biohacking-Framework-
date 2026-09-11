import { describe, expect, it } from 'vitest'
import { getInstalledMcpServer } from '../llm/mcp/install-store'
import { syncConnectorMcpInstall } from './connector-mcp-sync'
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

describe('connector MCP sync', () => {
  it('installs catalog MCP servers when a connector is enabled', () => {
    const storage = new MemoryStorage()
    setConnectorEnabled('paper-search', true, storage)
    syncConnectorMcpInstall('paper-search', true, storage)
    const installed = getInstalledMcpServer('paper-search', storage)
    expect(installed?.enabled).toBe(true)
    expect(installed?.executable).toBe('uvx')
  })

  it('disables installed MCP servers when a connector is turned off', () => {
    const storage = new MemoryStorage()
    syncConnectorMcpInstall('local-deep-research', true, storage)
    syncConnectorMcpInstall('local-deep-research', false, storage)
    expect(getInstalledMcpServer('local-deep-research', storage)?.enabled).toBe(false)
  })

  it('ignores connectors without MCP server bindings', () => {
    const storage = new MemoryStorage()
    expect(() => syncConnectorMcpInstall('paper-qa', true, storage)).not.toThrow()
    expect(getInstalledMcpServer('paper-qa', storage)).toBeUndefined()
  })
})
