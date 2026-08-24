export type LlmAction =
  | 'network-search'
  | 'scrape'
  | 'rag-read'
  | 'create'
  | 'update'
  | 'delete'
  | 'send'
  | 'store'
  | 'execute'

export type ApprovalRequest = {
  id: string
  action: LlmAction
  target: string
  reason: string
  payloadPreview?: unknown
  createdAt: string
}

export type ApprovalDecision = 'approved' | 'denied'

/**
 * Fail-closed policy: every externally observable, data-changing, or
 * retrieval action requires an explicit human approval token.
 */
export function requiresHumanApproval(action: LlmAction): true {
  void action
  return true
}

export function createApprovalRequest(input: Omit<ApprovalRequest, 'id' | 'createdAt'>): ApprovalRequest {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
}

export function assertApproved(decision: ApprovalDecision | undefined): void {
  if (decision !== 'approved') {
    throw new Error('LLM action blocked: explicit user approval is required.')
  }
}

export function denyByDefault(decision: ApprovalDecision | undefined): boolean {
  return decision !== 'approved'
}
