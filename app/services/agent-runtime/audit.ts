import type { RuntimeStore, AgentAuditEvent } from './types'

export async function recordAudit(store: RuntimeStore, event: AgentAuditEvent): Promise<void> {
  await store.appendAudit(event)
}

export async function recentAudit(store: RuntimeStore, limit = 100): Promise<AgentAuditEvent[]> {
  return store.loadAudit(limit)
}
