import { describe, expect, it } from 'vitest'
import { createMcpInstallTools } from './mcp-install-tools'

describe('mcp install tools', () => {
  it('registers catalog/install/uninstall/status tools', () => {
    const tools = createMcpInstallTools()
    expect(tools.map((tool) => tool.name)).toEqual(['mcp.catalog', 'mcp.status', 'mcp.install', 'mcp.uninstall'])
    expect(tools.find((tool) => tool.name === 'mcp.install')?.requiresApproval).toBe(true)
  })
})
