import { describe, expect, it, vi } from 'vitest'
import { continueAgentWithTools } from './runtime'
import type { AgentRun } from './types'
import type { AgentTask } from '~/services/agent-superstack/types'

vi.mock('~/services/llm-orchestrator', () => ({
  orchestrateLLM: vi.fn(async () => ({
    id: 'llm-1',
    provider: 'openai',
    model: 'test',
    text: 'Catalog tools finished. Native MCP still needs Agent.',
    latencyMs: 1,
    attempts: 1,
    fallbackUsed: false,
  })),
}))

const task: AgentTask = { id: 'task_mixed', kind: 'research', prompt: 'CRP plus pubmed' }

function runFixture(): AgentRun {
  return {
    id: 'run_mixed',
    task,
    status: 'waiting-approval',
    context: {
      task,
      memories: [],
      skills: [],
      policy: { allowed: true, reason: 'ok', requiresConfirmation: false },
    },
    observations: [],
    toolCalls: [
      { id: 'c1', name: 'plugins.garmin.schema', args: {}, requiresApproval: true },
      { id: 'c2', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
    ],
    startedAt: new Date().toISOString(),
  }
}

describe('continueAgentWithTools mixed approval', () => {
  it('executes an approved catalog tool and keeps paper-search waiting for Agent preflight', async () => {
    const run = runFixture()
    const updated = await continueAgentWithTools(task, run, [{
      id: 'c1',
      name: 'plugins.garmin.schema',
      args: {},
      requiresApproval: true,
      approvalToken: 'user-approved-1',
    }])
    expect(updated.observations.some((item) => item.kind === 'tool' && item.toolCallId === 'c1')).toBe(true)
    expect(updated.observations.some((item) => item.toolCallId === 'c2')).toBe(false)
    expect(updated.status).toBe('waiting-approval')
    expect(updated.toolCalls.find((call) => call.name === 'mcp.stdio:paper-search')?.approvalToken).toBeUndefined()
  })
})
