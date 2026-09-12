import { describe, expect, it } from 'vitest'
import {
  applyContinuedRunToApprovalFocus,
  applyNewRunToApprovalFocus,
  emptyApprovalFocusState,
  formatKeptPendingApprovalNotice,
} from './approval-focus'
import type { AgentRun } from './types'
import type { AgentTask } from '~/services/agent-superstack/types'

const waitingTask: AgentTask = { id: 'task_wait', kind: 'research', prompt: 'Ask PaperQA about CRP' }
const laterTask: AgentTask = { id: 'task_later', kind: 'chat', prompt: 'What is my Garmin status?' }

function runFixture(overrides: Partial<AgentRun> = {}): AgentRun {
  const task = overrides.task ?? waitingTask
  return {
    id: 'run_wait',
    task,
    status: 'waiting-approval',
    context: { task, memories: [], skills: [], policy: { allowed: true, reason: 'ok', requiresConfirmation: false } },
    observations: [],
    toolCalls: [{ id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true }],
    startedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('approval focus after a new chat run', () => {
  it('does not clobber a waiting-approval run when a later message starts a new run', () => {
    const waiting = runFixture()
    const later = runFixture({
      id: 'run_later',
      task: laterTask,
      status: 'completed',
      toolCalls: [{ id: 'g1', name: 'plugins.garmin.status', args: {} }],
      observations: [{ kind: 'tool', toolCallId: 'g1', text: '{"oauthConfigured":true}', createdAt: '1' }],
    })

    const next = applyNewRunToApprovalFocus({
      ...emptyApprovalFocusState(),
      activeRun: waiting,
      approvalQueue: [waiting],
      latestRun: waiting,
    }, later)

    expect(next.activeRun?.id).toBe('run_wait')
    expect(next.activeRun?.status).toBe('waiting-approval')
    expect(next.latestRun?.id).toBe('run_later')
    expect(next.approvalQueue.map((run) => run.id)).toEqual(['run_wait'])
    expect(next.notice).toContain('research.paperqa.ask')
    expect(next.notice).toContain('Garmin status')
    expect(formatKeptPendingApprovalNotice(waiting, later)).toContain('Approve box stays')
  })

  it('queues a later waiting-approval run instead of stealing the Approve box', () => {
    const waiting = runFixture()
    const later = runFixture({
      id: 'run_later',
      task: laterTask,
      toolCalls: [{ id: 'n1', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true }],
    })

    const next = applyNewRunToApprovalFocus({
      ...emptyApprovalFocusState(),
      activeRun: waiting,
      approvalQueue: [waiting],
      latestRun: waiting,
    }, later)

    expect(next.activeRun?.id).toBe('run_wait')
    expect(next.approvalQueue.map((run) => run.id)).toEqual(['run_wait', 'run_later'])
    expect(next.latestRun?.id).toBe('run_later')
  })

  it('takes focus when nothing is waiting', () => {
    const completed = runFixture({
      id: 'run_done',
      status: 'completed',
      toolCalls: [],
    })
    const next = applyNewRunToApprovalFocus({
      ...emptyApprovalFocusState(),
      activeRun: completed,
      latestRun: completed,
    }, runFixture())

    expect(next.activeRun?.id).toBe('run_wait')
    expect(next.approvalQueue.map((run) => run.id)).toEqual(['run_wait'])
    expect(next.notice).toBeNull()
  })
})

describe('approval focus after continue/approve', () => {
  it('promotes the queued waiting run after the focused run is resolved', () => {
    const waiting = runFixture()
    const queued = runFixture({
      id: 'run_later',
      task: laterTask,
      toolCalls: [{ id: 'n1', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true }],
    })
    const resolved = runFixture({
      status: 'completed',
      toolCalls: [{
        id: 'c1',
        name: 'research.paperqa.ask',
        args: { question: 'CRP' },
        requiresApproval: true,
        approvalToken: 'user-1',
      }],
      observations: [{ kind: 'tool', toolCallId: 'c1', text: '{"ok":true}', createdAt: '1' }],
    })

    const next = applyContinuedRunToApprovalFocus({
      activeRun: waiting,
      approvalQueue: [waiting, queued],
      latestRun: queued,
      notice: 'held',
    }, resolved)

    expect(next.activeRun?.id).toBe('run_later')
    expect(next.approvalQueue.map((run) => run.id)).toEqual(['run_later'])
    expect(next.notice).toBeNull()
  })

  it('keeps leftover native tools in focus after a catalog-only continue', () => {
    const mixed = runFixture({
      toolCalls: [
        { id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true, approvalToken: 'user-1' },
        { id: 'c2', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
      ],
      observations: [{ kind: 'tool', toolCallId: 'c1', text: '{"ok":true}', createdAt: '1' }],
    })

    const next = applyContinuedRunToApprovalFocus({
      activeRun: mixed,
      approvalQueue: [mixed],
      latestRun: mixed,
      notice: null,
    }, mixed)

    expect(next.activeRun?.id).toBe('run_wait')
    expect(next.approvalQueue.map((run) => run.id)).toEqual(['run_wait'])
  })
})
