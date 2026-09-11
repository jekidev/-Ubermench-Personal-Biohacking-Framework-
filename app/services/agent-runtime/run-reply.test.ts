import { describe, expect, it } from 'vitest'
import {
  applyWaitingApprovalIfNeeded,
  formatAgentRunReply,
  runNeedsApprovalUi,
  formatNativeMcpAgentHandoff,
  pendingAgentToolCalls,
  pendingCatalogAgentToolCalls,
  pendingNativeAgentToolCalls,
  summarizeAgentRunForUi,
} from './run-reply'
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
    expect(formatAgentRunReply(run)).toContain('Approve catalog tools (research.paperqa.ask) on Chat, Overview, or Agent')
    expect(formatAgentRunReply(run)).not.toContain('Native MCP still needs')
  })

  it('tells Chat users that native MCP still needs the Agent token', () => {
    const run = runFixture({
      status: 'waiting-approval',
      toolCalls: [{ id: 'c1', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true }],
    })
    expect(formatAgentRunReply(run)).toContain('mcp.stdio:paper-search')
    expect(formatAgentRunReply(run)).toContain('Agent Control Center preflight token')
    expect(formatNativeMcpAgentHandoff(pendingNativeAgentToolCalls(run))).toContain('mcp.stdio:paper-search')
  })

  it('keeps catalog approvable when native MCP is also pending', () => {
    const run = runFixture({
      status: 'waiting-approval',
      toolCalls: [
        { id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true },
        { id: 'c2', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
      ],
    })
    expect(pendingCatalogAgentToolCalls(run).map((call) => call.name)).toEqual(['research.paperqa.ask'])
    expect(pendingNativeAgentToolCalls(run).map((call) => call.name)).toEqual(['mcp.stdio:paper-search'])
    const reply = formatAgentRunReply(run)
    expect(reply).toContain('Approve catalog tools (research.paperqa.ask)')
    expect(reply).toContain('mcp.stdio:paper-search')
    expect(summarizeAgentRunForUi(run).status).toBe('waiting-approval')
  })

  it('leaves leftover native tools in waiting-approval after a catalog-only wave', () => {
    const run = runFixture({
      status: 'executing',
      toolCalls: [
        { id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true, approvalToken: 'user-1' },
        { id: 'c2', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
      ],
      observations: [{ kind: 'tool', toolCallId: 'c1', text: '{"ok":true}', createdAt: '1' }],
    })
    const leftover = applyWaitingApprovalIfNeeded(run)
    expect(leftover.map((call) => call.name)).toEqual(['mcp.stdio:paper-search'])
    expect(run.status).toBe('waiting-approval')
    expect(run.completedAt).toBeUndefined()
  })

  it('shows approval UI when leftover native tools exist even if status is still executing', () => {
    const run = runFixture({
      status: 'executing',
      toolCalls: [
        { id: 'c2', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
      ],
      observations: [{ kind: 'system', text: 'Continuation model failed: no provider key', createdAt: '2' }],
    })
    expect(runNeedsApprovalUi(run)).toBe(true)
    expect(formatAgentRunReply(run)).toContain('Continuation model failed')
    expect(formatAgentRunReply(run)).toContain('mcp.stdio:paper-search')
  })
})
