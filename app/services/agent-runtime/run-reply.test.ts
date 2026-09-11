import { describe, expect, it } from 'vitest'
import { formatAgentRunReply, pendingAgentToolCalls } from './run-reply'
import type { AgentRun } from './types'
import type { AgentTask } from '~/services/agent-superstack/types'

const task: AgentTask = { id: 't1', kind: 'research', prompt: 'inspect garmin' }

function runFixture(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: 'r1',
    task,
    status: 'completed',
    context: { task, memories: [], skills: [], policy: { allowed: true, reason: 'ok', requiresConfirmation: false } },
    observations: [],
    toolCalls: [],
    startedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('agent run reply', () => {
  it('includes tool results before the model continuation', () => {
    const reply = formatAgentRunReply(runFixture({
      toolCalls: [{ id: 'c1', name: 'plugins.garmin.status', args: {} }],
      observations: [
        { kind: 'model', text: '{"toolCalls":[]}', createdAt: '1' },
        { kind: 'tool', toolCallId: 'c1', text: '{"oauthConfigured":true}', createdAt: '2' },
        { kind: 'model', text: 'Garmin is configured.', createdAt: '3' },
      ],
    }))
    expect(reply).toContain('plugins.garmin.status')
    expect(reply).toContain('oauthConfigured')
    expect(reply).toContain('Garmin is configured.')
  })

  it('lists pending approval tools', () => {
    const run = runFixture({
      status: 'waiting-approval',
      toolCalls: [{ id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true }],
    })
    expect(pendingAgentToolCalls(run).map((call) => call.name)).toEqual(['research.paperqa.ask'])
    expect(formatAgentRunReply(run)).toContain('Waiting for approval: research.paperqa.ask')
    expect(formatAgentRunReply(run)).toContain('Approve on Chat, Overview, or Agent Control Center')
    expect(formatAgentRunReply(run)).not.toContain('Native MCP')
  })

  it('tells Chat users that native MCP still needs the Agent token', () => {
    const run = runFixture({
      status: 'waiting-approval',
      toolCalls: [{ id: 'c1', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true }],
    })
    expect(formatAgentRunReply(run)).toContain('mcp.stdio:paper-search')
    expect(formatAgentRunReply(run)).toContain('Agent Control Center preflight token')
  })
})
