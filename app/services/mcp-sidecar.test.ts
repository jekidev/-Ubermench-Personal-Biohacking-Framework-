import { describe, expect, it, vi } from 'vitest'
import { checkMcpSidecar, MCP_SIDECAR_BROWSER_MESSAGE } from './mcp-sidecar'

vi.mock('~/utils/runtime-platform', () => ({
  isTauriRuntime: () => false,
}))

describe('mcp sidecar check', () => {
  it('fails clearly in the browser without starting uvx or Docker', async () => {
    const result = await checkMcpSidecar('paper-search')
    expect(result.ok).toBe(false)
    expect(result.tauri).toBe(false)
    expect(result.command).toBe('uvx')
    expect(result.args).toEqual(['paper-search-mcp'])
    expect(result.error).toBe(MCP_SIDECAR_BROWSER_MESSAGE)
    expect(result.settingsHref).toContain('tab=research')
  })

  it('rejects unknown servers with a Settings link', async () => {
    const result = await checkMcpSidecar('not-a-sidecar')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/unknown mcp sidecar/i)
  })
})
