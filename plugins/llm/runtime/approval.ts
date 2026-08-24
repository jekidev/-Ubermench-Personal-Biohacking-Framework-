import { createApprovalRequest, type ApprovalRequest } from '../security/human-approval-gate'
import type { ToolRequest } from './types'

export function toApprovalRequest(request: ToolRequest): ApprovalRequest {
  return createApprovalRequest({
    action: request.action,
    target: request.target,
    reason: request.reason,
    payloadPreview: request.payload,
  })
}

/** No tool may execute directly from this module; it only creates pending requests. */
export function planAction(request: ToolRequest): ApprovalRequest {
  return toApprovalRequest(request)
}
