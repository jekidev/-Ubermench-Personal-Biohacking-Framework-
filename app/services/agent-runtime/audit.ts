import type { RuntimeStore, AgentAuditEvent } from './types'
import { redactSecrets } from './secret-redaction'

export async function recordAudit(store: RuntimeStore, event: AgentAuditEvent): Promise<void> {
  await store.appendAudit({
    ...event,
    detail: String(redactSecrets(event.detail)),
    metadata: event.metadata ? redactSecrets(event.metadata) as Record<string, unknown> : undefined,
  })
}

export async function recentAudit(store: RuntimeStore, limit = 100): Promise<AgentAuditEvent[]> {
  return store.loadAudit(limit)
}
