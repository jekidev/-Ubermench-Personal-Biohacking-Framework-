import { describe, expect, it } from 'vitest'
import { getMcpServer } from '../llm/mcp/servers'
import { CONNECTOR_REGISTRY, getConnector } from './registry'
import { loadConnectorSettings, setConnectorEnabled } from './connector-store'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('connector registry', () => {
  it('includes Cursor-parity connectors', () => {
    const ids = CONNECTOR_REGISTRY.map((entry) => entry.id)
    expect(ids).toContain('gmail')
    expect(ids).toContain('google-drive')
    expect(ids).toContain('google-calendar')
    expect(ids).toContain('huggingface')
    expect(ids).toContain('discord')
    expect(ids).toContain('paper-search')
    expect(ids).toContain('paper-qa')
    expect(ids).toContain('local-deep-research')
    expect(ids).toContain('pdf-inspector')
    expect(ids).toContain('agent-memory')
    expect(ids).toContain('supermemory')
    expect(ids).toContain('mem0')
    expect(ids).toContain('mcp-memory')
  })

  it('tracks enabled state in local storage', () => {
    const storage = new MemoryStorage()
    setConnectorEnabled('discord', true, storage)
    expect(loadConnectorSettings(storage).enabled.discord).toBe(true)
  })

  it('resolves connector by id', () => {
    expect(getConnector('huggingface')?.transport).toBe('hybrid')
  })

  it('does not contain duplicate connector ids', () => {
    const ids = CONNECTOR_REGISTRY.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only references MCP servers that exist in the executable catalog', () => {
    for (const connector of CONNECTOR_REGISTRY) {
      if (!connector.mcpServerId) continue
      expect(getMcpServer(connector.mcpServerId), `${connector.id} -> ${connector.mcpServerId}`).toBeDefined()
    }
  })
})
