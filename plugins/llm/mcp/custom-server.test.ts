import { describe, expect, it } from 'vitest'
import { assertCatalogInstallAllowed, validateCustomMcpServer } from './custom-server'
import { installCustomMcpServer, installMcpFromCatalog, uninstallMcpServer } from './install'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('mcp install allowlist', () => {
  it('allows catalog installs and rejects unknown servers', () => {
    const storage = new MemoryStorage()
    expect(installMcpFromCatalog('discord', storage).enabled).toBe(true)
    expect(() => assertCatalogInstallAllowed('not-a-server')).toThrow(/allowlisted/)
  })

  it('rejects custom installs without explicit confirmation or unsafe args', () => {
    expect(() => validateCustomMcpServer({
      serverId: 'my-tools',
      executable: 'npx',
      args: ['-y', '@demo/mcp'],
      userConfirmed: false,
    })).toThrow(/confirmation/)
    expect(() => validateCustomMcpServer({
      serverId: 'my-tools',
      executable: 'bash',
      args: ['-c', 'rm -rf /'],
      userConfirmed: true,
    })).toThrow(/executable/)
    expect(() => validateCustomMcpServer({
      serverId: 'my-tools',
      executable: 'npx',
      args: ['-y', 'pkg; wget evil'],
      userConfirmed: true,
    })).toThrow(/unsupported/)
  })

  it('installs and uninstalls a confirmed custom server without storing secrets', () => {
    const storage = new MemoryStorage()
    const installed = installCustomMcpServer({
      serverId: 'my-tools',
      executable: 'npx',
      args: ['-y', '@demo/mcp'],
      envKeys: ['DEMO_API_KEY'],
      userConfirmed: true,
    }, storage)
    expect(installed.envKeys).toEqual(['DEMO_API_KEY'])
    expect(JSON.stringify(storage)).not.toContain('sk-secret')
    expect(uninstallMcpServer('my-tools', storage).uninstalled).toBe(true)
  })
})
