import { createApprovalRequest, type ApprovalRequest } from '../security/human-approval-gate'
import type { ActiveModel, ToolRequest } from './types'

export type ProviderPlan = {
  model: ActiveModel
  approval: ApprovalRequest
}

/**
 * Planning only. No network request is performed here.
 * Sending the conversation to an LLM provider is itself a gated action.
 */
export function planProviderCall(model: ActiveModel, target: string, reason: string, payload: unknown): ProviderPlan {
  const request: ToolRequest = { action: 'send', target, reason, payload }
  return {
    model,
    approval: createApprovalRequest({
      action: request.action,
      target: request.target,
      reason: request.reason,
      payloadPreview: request.payload,
    }),
  }
}
