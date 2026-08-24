import type { ApprovalDecision, ApprovalRequest } from './human-approval-gate'

export type ApprovalAuditEvent = ApprovalRequest & {
  decision?: ApprovalDecision
  decidedAt?: string
}

/** Append-only in-memory audit model; persistence must itself pass the approval gate. */
export class ApprovalAudit {
  private readonly events: ApprovalAuditEvent[] = []

  record(request: ApprovalRequest, decision?: ApprovalDecision): ApprovalAuditEvent {
    const event = { ...request, decision, decidedAt: decision ? new Date().toISOString() : undefined }
    this.events.push(event)
    return event
  }

  list(): readonly ApprovalAuditEvent[] {
    return this.events
  }
}
