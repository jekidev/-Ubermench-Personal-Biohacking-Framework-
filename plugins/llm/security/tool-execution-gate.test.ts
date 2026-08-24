import { describe, expect, it } from 'vitest'
import { executeApprovedTool } from './tool-execution-gate'
import type { ApprovalToken } from './approval-token'

const token = (overrides: Partial<ApprovalToken> = {}): ApprovalToken => ({
  tokenId: 'test-token',
  action: 'send',
  target: 'provider:test',
  payloadHash: 'x',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  decision: 'approved',
  used: false,
  ...overrides,
})

describe('central tool execution gate', () => {
  it('blocks without approval token', async () => {
    await expect(executeApprovedTool('send', 'provider:test', { message: 'x' }, { runtime: 'tauri' }, async () => 'sent')).rejects.toThrow('explicit user approval')
  })

  it('blocks destructive actions outside Tauri', async () => {
    await expect(executeApprovedTool('delete', 'file:test', { path: 'x' }, { runtime: 'web', token: token({ action: 'delete', target: 'file:test' }) }, async () => 'deleted')).rejects.toThrow('Tauri runtime')
  })

  it('does not call handler with expired token', async () => {
    let invoked = false
    const expired = token({ expiresAt: new Date(Date.now() - 1).toISOString() })
    await expect(executeApprovedTool('send', 'provider:test', { message: 'x' }, { runtime: 'tauri', token: expired }, async () => { invoked = true; return 'sent' })).rejects.toThrow('expired')
    expect(invoked).toBe(false)
  })
})
