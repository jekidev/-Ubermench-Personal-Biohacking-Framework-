import { describe, expect, it } from 'vitest'
import { createCheckpoint, shouldResume } from './checkpoint'
import type { AgentRun } from './types'

describe('agent checkpoints', () => {
  const run = { id: 'run_1', task: { id: 'task_1', kind: 'research', prompt: 'test' }, status: 'waiting-approval', context: { task: { id: 'task_1', kind: 'research', prompt: 'test' }, memories: [], skills: [], policy: { allowed: true, reason: 'ok', requiresConfirmation: false } }, observations: [], toolCalls: [], startedAt: new Date().toISOString() } as AgentRun

  it('snapshots the full run and resumes recoverable phases', () => {
    const checkpoint = createCheckpoint(run, 4)
    expect(checkpoint.runId).toBe('run_1')
    expect(checkpoint.taskId).toBe('task_1')
    expect(checkpoint.sequence).toBe(4)
    expect(shouldResume(checkpoint)).toBe(true)
  })

  it('does not resume completed runs', () => {
    expect(shouldResume(createCheckpoint({ ...run, status: 'completed' }, 5))).toBe(false)
  })
})
