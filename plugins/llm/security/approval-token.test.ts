import { describe, expect, it } from 'vitest'
import { createApprovalRequest } from './human-approval-gate'
import { consumeApprovalToken, issueApprovalToken } from './approval-token'

describe('scoped approval tokens', () => {
  it('accepts the exact approved action, target and payload once', async () => {
    const request = createApprovalRequest({
      action: 'send',
      target: 'https://example.invalid/api',
      reason: 'User requested a send',
      payloadPreview: { value: 'approved' },
    })
    const token = await issueApprovalToken(request)
    await consumeApprovalToken(token, 'send', 'https://example.invalid/api', { value: 'approved' })
    expect(token.used).toBe(true)
  })

  it('rejects a changed payload', async () => {
    const request = createApprovalRequest({
      action: 'update',
      target: 'file.txt',
      reason: 'User requested an update',
      payloadPreview: { content: 'approved' },
    })
    const token = await issueApprovalToken(request)
    await expect(consumeApprovalToken(token, 'update', 'file.txt', { content: 'changed' })).rejects.toThrow('payload does not match')
  })

  it('rejects a second use', async () => {
    const request = createApprovalRequest({ action: 'delete', target: 'x', reason: 'User requested deletion', payloadPreview: null })
    const token = await issueApprovalToken(request)
    await consumeApprovalToken(token, 'delete', 'x', null)
    await expect(consumeApprovalToken(token, 'delete', 'x', null)).rejects.toThrow('already been used')
  })

  it('rejects an expired token', async () => {
    const request = createApprovalRequest({ action: 'store', target: 'local', reason: 'User requested storage', payloadPreview: { x: 1 } })
    const token = await issueApprovalToken(request, -1)
    await expect(consumeApprovalToken(token, 'store', 'local', { x: 1 })).rejects.toThrow('expired')
  })
})
