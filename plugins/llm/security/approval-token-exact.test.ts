import { describe, expect, it } from 'vitest'
import { issueApprovalToken, consumeApprovalToken } from './approval-token'
import type { ApprovalRequest } from './human-approval-gate'

const request: ApprovalRequest = {
  id: 'r1', action: 'send', target: 'provider:test', reason: 'test', payloadPreview: { preview: true }, createdAt: new Date().toISOString(),
}

describe('exact approval payload binding', () => {
  it('rejects payload changes after approval', async () => {
    const exact = { messages: [{ role: 'user', content: 'hello' }], options: { temperature: 0.2 } }
    const token = await issueApprovalToken(request, exact)
    await expect(consumeApprovalToken(token, 'send', 'provider:test', { messages: [{ role: 'user', content: 'changed' }], options: { temperature: 0.2 } })).rejects.toThrow('approved payload does not match')
  })

  it('accepts equivalent nested object key ordering', async () => {
    const token = await issueApprovalToken(request, { a: 1, nested: { x: 2, y: 3 } })
    await expect(consumeApprovalToken(token, 'send', 'provider:test', { nested: { y: 3, x: 2 }, a: 1 })).not.toThrow()
  })
})
