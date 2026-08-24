import { describe, expect, it } from 'vitest'
import { createApprovalRequest } from './human-approval-gate'
import { consumeApprovalToken, issueApprovalToken } from './approval-token'

describe('approval token TTL compatibility', () => {
  it('treats a numeric second argument as TTL for the legacy API', async () => {
    const request = createApprovalRequest({
      action: 'store',
      target: 'local',
      reason: 'User requested storage',
      payloadPreview: { x: 1 },
    })
    const token = await issueApprovalToken(request, -1)
    await expect(consumeApprovalToken(token, 'store', 'local', { x: 1 })).rejects.toThrow('expired')
  })
})
