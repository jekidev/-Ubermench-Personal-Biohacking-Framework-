import { describe, expect, it } from 'vitest'
import { issueApprovalToken, consumeApprovalToken } from './approval-token'
import type { ApprovalRequest } from './human-approval-gate'

const request: ApprovalRequest = {
  id: 'r1', action: 'send', target: 'provider:test', reason: 'test', payloadPreview: { message: 'preview' }, createdAt: new Date().toISOString(),
}

describe('approval token exact payload binding', () => {
  it('does not allow a different payload after approval', async () => {
    const payload = { message: 'exact', nested: { value: 1 } }
    const token = await issueApprovalToken(request, payload)
    await expect(consumeApprovalToken(token, 'send', 'provider:test', { message: 'changed', nested: { value: 1 } })).rejects.toThrow('approved payload does not match')
  })

  it('accepts equivalent object key ordering', async () => {
    const token = await issueApprovalToken(request, { a: 1, b: { x: 2 } })
    await expect(consumeApprovalToken(token, 'send', 'provider:test', { b: { x: 2 }, a: 1 })).not.toThrow()
  })
})
