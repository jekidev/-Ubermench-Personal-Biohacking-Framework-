import { describe, expect, it } from 'vitest'
import { executeApprovedToolCalls } from './tool-loop'
import type { AgentRun, AgentToolCall } from './types'
import type { AgentTask } from '~/services/agent-superstack/types'

const task: AgentTask = { id: 'task_test', prompt: 'inspect local memory', kind: 'coding', riskLevel: 'low' }

function runFixture(): AgentRun {
  return {
    id: 'run_test', task, status: 'executing', context: { task, memories: [], skills: [], selectedModel: undefined, policy: { allowed: true, reason: 'allowed', requiresConfirmation: false } },
    observations: [], toolCalls: [], startedAt: new Date().toISOString(),
  }
}

describe('agent tool loop', () => {
  it('executes low-risk tools and records observations', async () => {
    const run = runFixture()
    const calls: AgentToolCall[] = [{ id: 'c1', name: 'memory.search', args: { query: 'omega' } }]
    const result = await executeApprovedToolCalls(task, run, calls)
    expect(result.executed).toBe(1)
    expect(run.observations).toHaveLength(1)
    expect(run.observations[0]?.kind).toBe('tool')
  })

  it('fails closed for an approval-required native tool without a token', async () => {
    const run = runFixture()
    const calls: AgentToolCall[] = [{ id: 'c1', name: 'mcp.stdio', requiresApproval: true, args: { command: 'node', args: ['server.js'] } }]
    await expect(executeApprovedToolCalls(task, run, calls)).rejects.toThrow('approval token')
    expect(run.status).toBe('failed')
  })

  it('bounds tool execution count', async () => {
    const run = runFixture()
    const calls: AgentToolCall[] = Array.from({ length: 12 }, (_, index) => ({ id: `c${index}`, name: 'memory.search', args: { query: String(index) } }))
    const result = await executeApprovedToolCalls(task, run, calls, 2)
    expect(result.executed).toBe(2)
  })

  it('serializes concurrent submissions for the same run and de-duplicates by call id', async () => {
    const run = runFixture()
    const call: AgentToolCall = { id: 'same-call', name: 'memory.search', args: { query: 'omega' } }
    const [first, second] = await Promise.all([
      executeApprovedToolCalls(task, run, [call]),
      executeApprovedToolCalls(task, run, [call]),
    ])
    expect(first.executed + second.executed).toBe(1)
    expect(run.toolCalls).toHaveLength(1)
    expect(run.observations).toHaveLength(1)
  })
})
