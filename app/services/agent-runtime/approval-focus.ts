import { pendingAgentToolCalls, runNeedsApprovalUi } from './run-reply'
import type { AgentRun } from './types'

export type ApprovalFocusState = {
  activeRun: AgentRun | null
  approvalQueue: AgentRun[]
  latestRun: AgentRun | null
  notice: string | null
}

export function emptyApprovalFocusState(): ApprovalFocusState {
  return {
    activeRun: null,
    approvalQueue: [],
    latestRun: null,
    notice: null,
  }
}

function dedupeQueue(runs: AgentRun[]): AgentRun[] {
  const seen = new Set<string>()
  const queue: AgentRun[] = []
  for (const run of runs) {
    if (!run?.id || seen.has(run.id) || !runNeedsApprovalUi(run)) continue
    seen.add(run.id)
    queue.push(run)
  }
  return queue
}

export function formatKeptPendingApprovalNotice(pending: AgentRun, latest: AgentRun): string {
  const tools = pendingAgentToolCalls(pending).map((call) => call.name).join(', ')
  const pendingLabel = tools || pending.status
  const latestLabel = latest.task.prompt.trim() || latest.id
  return `A previous run is still waiting for approval (${pendingLabel}). The Approve box stays on that run until it is resolved. This new reply is from a later run: ${latestLabel}`
}

export function applyNewRunToApprovalFocus(
  state: ApprovalFocusState,
  next: AgentRun,
): ApprovalFocusState {
  const current = state.activeRun
  if (current && runNeedsApprovalUi(current) && current.id !== next.id) {
    const queue = dedupeQueue([
      current,
      ...state.approvalQueue,
      ...(runNeedsApprovalUi(next) ? [next] : []),
    ])
    return {
      activeRun: current,
      approvalQueue: queue,
      latestRun: next,
      notice: formatKeptPendingApprovalNotice(current, next),
    }
  }

  return {
    activeRun: next,
    approvalQueue: runNeedsApprovalUi(next) ? [next] : [],
    latestRun: next,
    notice: null,
  }
}

export function applyContinuedRunToApprovalFocus(
  state: ApprovalFocusState,
  continued: AgentRun,
): ApprovalFocusState {
  const replaced = state.approvalQueue.map((run) => (run.id === continued.id ? continued : run))
  let queue = dedupeQueue(replaced)
  if (runNeedsApprovalUi(continued) && !queue.some((run) => run.id === continued.id)) {
    const keepCurrentFocus = Boolean(
      state.activeRun
      && runNeedsApprovalUi(state.activeRun)
      && state.activeRun.id !== continued.id,
    )
    queue = keepCurrentFocus ? [...queue, continued] : [continued, ...queue]
  }

  const wasFocused = state.activeRun?.id === continued.id
  const nextActive = wasFocused
    ? (queue[0] ?? continued)
    : (state.activeRun && runNeedsApprovalUi(state.activeRun) ? state.activeRun : (queue[0] ?? continued))

  const leftover = queue.filter((run) => run.id !== nextActive.id)
  return {
    activeRun: nextActive,
    approvalQueue: queue,
    latestRun: state.latestRun?.id === continued.id ? continued : state.latestRun,
    notice: leftover.length
      ? `Another run is still waiting for approval (${leftover.length}).`
      : null,
  }
}
