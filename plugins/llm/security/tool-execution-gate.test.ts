import { describe, expect, it } from 'vitest'
import { executeApprovedTool } from './tool-execution-gate'
import type { ApprovalToken } from './approval-token'

const validToken = (overrides: Partial<ApprovalToken> = {}): ApprovalToken => ({
  tokenId: 'test-token',
  action: 'send',
  target: 'provider:test',
  payloadHash: 'invalid-unless-mocked',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  decision: 'approved',
  used: false,
  ...overrides,
})

describe('central LLM tool execution gate', () => {
  it('blocks execution without a token', async () => {
    await expect(executeApprovedTool('send', 'provider:test', { message: 'x' }, { runtime: 'tauri' }, async () => 'sent')).rejects.toThrow('explicit user approval')
  })

  it('blocks destructive actions outside Tauri before handler execution', async () => {
    const handler = async () => 'executed'
    await expect(executeApprovedTool('delete', 'file:test', { path: 'x' }, { runtime: 'web', token: validToken({ action: 'delete', target: 'file:test' }) }, handler)).rejects.toThrow('Tauri runtime')
  })

  it('does not invoke the handler when the token is expired', async () => {
    let invoked = false
    const expired = validToken({ expiresAt: new Date(Date.now() - 1).toISOString() })
    await expect(executeApprovedTool('send', 'provider:test', { message: 'x' }, { runtime: 'tauri', token: expired }, async () => { invoked = true; return 'sent' })).rejects.toThrow('expired')
    expect(invoked).toBe(false)
  })
})
