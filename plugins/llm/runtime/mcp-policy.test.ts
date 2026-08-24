import { describe, expect, it } from 'vitest'
import { assertMcpRuntime, canUseMcp } from './mcp-policy'

describe('MCP runtime boundaries', () => {
  it('blocks stdio outside Tauri', () => {
    expect(() => assertMcpRuntime({ transport: 'stdio', runtime: 'web', requiresExplicitApproval: true })).toThrow(/Tauri runtime/)
  })

  it('requires explicit approval for HTTP MCP', () => {
    const policy = { transport: 'http' as const, runtime: 'web' as const, requiresExplicitApproval: true as const }
    expect(canUseMcp(policy, false)).toBe(false)
    expect(canUseMcp(policy, true)).toBe(true)
  })

  it('permits stdio only when approved and in Tauri', () => {
    const policy = { transport: 'stdio' as const, runtime: 'tauri' as const, requiresExplicitApproval: true as const }
    expect(canUseMcp(policy, false)).toBe(false)
    expect(canUseMcp(policy, true)).toBe(true)
  })
})
