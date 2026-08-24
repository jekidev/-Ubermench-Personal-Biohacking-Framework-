import { describe, expect, it } from 'vitest'
import type { AgentAuditEvent, RuntimeStore, AgentRun } from './types'
import type { MemoryRecord } from '~/services/agent-superstack/types'

class MemoryAuditStore implements RuntimeStore {
  private events: AgentAuditEvent[] = []
  async loadMemory(): Promise<MemoryRecord[]> { return [] }
  async saveMemory(): Promise<void> {}
  async appendRun(_run: AgentRun): Promise<void> {}
  async loadRuns(): Promise<AgentRun[]> { return [] }
  async findRunByTaskId(_taskId: string): Promise<AgentRun | undefined> { return undefined }
  async appendAudit(event: AgentAuditEvent): Promise<void> { this.events.unshift(event) }
  async loadAudit(limit = 100): Promise<AgentAuditEvent[]> { return this.events.slice(0, limit) }
}

describe('agent audit', () => {
  it('preserves ordered audit events', async () => {
    const store = new MemoryAuditStore()
    await store.appendAudit({ id: '1', runId: 'run1', type: 'run.started', detail: 'started', createdAt: '2026-08-24T00:00:00.000Z' })
    await store.appendAudit({ id: '2', runId: 'run1', type: 'run.completed', detail: 'done', createdAt: '2026-08-24T00:00:01.000Z' })
    const events = await store.loadAudit()
    expect(events.map((event) => event.type)).toEqual(['run.completed', 'run.started'])
  })
})
