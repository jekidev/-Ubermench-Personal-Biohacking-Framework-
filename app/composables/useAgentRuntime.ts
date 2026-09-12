import { recentAudit } from '~/services/agent-runtime/audit'
import {
  applyContinuedRunToApprovalFocus,
  applyNewRunToApprovalFocus,
} from '~/services/agent-runtime/approval-focus'
import { invokeCatalogTool } from '~/services/agent-runtime/invoke-tool'
import { selectNativeApprovalCallIds } from '~/services/agent-runtime/mcp-server-tools'
import { continueAgentWithTools, runAgentTask } from '~/services/agent-runtime/runtime'
import { pendingAgentToolCalls } from '~/services/agent-runtime/run-reply'
import { partitionPendingByApprovalSurface, selectApprovableToolCalls } from '~/services/agent-runtime/tool-plan'
import { createRuntimeStore } from '~/services/agent-runtime/store'
import type { AgentTask } from '~/services/agent-superstack/types'
import type { AgentRun, AgentToolCall } from '~/services/agent-runtime/types'
import { providerHealth } from '~/services/agent-runtime/provider-health'

export type ApprovePendingOptions = {
  includeNative?: boolean
  nativeCommand?: string
  nativeArgs?: string[]
  nativeCallId?: string
}

function nativeApprovalIds(pending: AgentToolCall[], options: ApprovePendingOptions): string[] | undefined {
  if (options.includeNative !== true) return undefined
  const native = partitionPendingByApprovalSurface(pending).native
  return selectNativeApprovalCallIds(native, options)
}

export function useAgentRuntime() {
  const activeRun = useState<AgentRun | null>('ubermench-agent-active-run', () => null)
  const approvalQueue = useState<AgentRun[]>('ubermench-agent-approval-queue', () => [])
  const latestRun = useState<AgentRun | null>('ubermench-agent-latest-run', () => null)
  const approvalNotice = useState<string | null>('ubermench-agent-approval-notice', () => null)
  const status = useState<'idle' | 'running' | 'error'>('ubermench-agent-runtime-status', () => 'idle')
  const error = useState<string | null>('ubermench-agent-runtime-error', () => null)

  function focusSnapshot() {
    return {
      activeRun: activeRun.value,
      approvalQueue: approvalQueue.value,
      latestRun: latestRun.value,
      notice: approvalNotice.value,
    }
  }

  function applyFocus(next: ReturnType<typeof applyNewRunToApprovalFocus>) {
    activeRun.value = next.activeRun
    approvalQueue.value = next.approvalQueue
    latestRun.value = next.latestRun
    approvalNotice.value = next.notice
  }

  async function run(task: AgentTask) {
    status.value = 'running'
    error.value = null
    try {
      const next = await runAgentTask(task)
      applyFocus(applyNewRunToApprovalFocus(focusSnapshot(), next))
      status.value = 'idle'
      return next
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      status.value = 'error'
      throw cause
    }
  }

  async function continueRun(task: AgentTask, runRecord: AgentRun, calls: AgentToolCall[]) {
    status.value = 'running'
    error.value = null
    try {
      const updated = await continueAgentWithTools(task, runRecord, calls)
      applyFocus(applyContinuedRunToApprovalFocus(focusSnapshot(), updated))
      status.value = 'idle'
      return updated
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      status.value = 'error'
      throw cause
    }
  }

  async function resume(task: AgentTask, approvalToken?: string) {
    const existing = await createRuntimeStore().findRunByTaskId(task.id)
    if (!existing) throw new Error(`No recoverable run found for task ${task.id}.`)
    if (existing.status === 'waiting-approval') {
      const pending = pendingAgentToolCalls(existing)
      if (!pending.length) return continueRun(task, existing, [])
      const token = approvalToken?.trim()
      if (pending.some((call) => call.requiresApproval) && !token) {
        throw new Error('Pending tool calls require explicit approval.')
      }
      const approvable = selectApprovableToolCalls(pending, {
        includeNative: Boolean(token),
        nativeCallIds: token ? nativeApprovalIds(pending, { includeNative: true }) : undefined,
      })
      return continueRun(task, existing, approvable.map((call) => ({ ...call, approvalToken: token })))
    }
    return run(task)
  }

  async function approvePending(approvalToken?: string, options: ApprovePendingOptions = {}) {
    const run = activeRun.value
    if (!run) throw new Error('No active agent run to approve.')
    const pending = pendingAgentToolCalls(run)
    if (!pending.length) return run
    const approvable = selectApprovableToolCalls(pending, {
      includeNative: options.includeNative === true,
      nativeCallIds: nativeApprovalIds(pending, options),
    })
    if (!approvable.length) {
      throw new Error('Pending native MCP tools need Agent Control Center (preflight token). Catalog tools are already approved or none are waiting.')
    }
    const token = approvalToken?.trim() || `user-approved-${Date.now()}`
    return continueRun(run.task, run, approvable.map((call) => ({ ...call, approvalToken: token })))
  }

  async function invokeTool(name: string, args: Record<string, unknown> = {}, approvalToken?: string) {
    status.value = 'running'
    error.value = null
    try {
      return await invokeCatalogTool(name, args, approvalToken)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      status.value = 'error'
      throw cause
    } finally {
      if (status.value === 'running') status.value = 'idle'
    }
  }

  async function recentRuns(limit = 20) { return createRuntimeStore().loadRuns(limit) }
  async function audit(limit = 100) { return recentAudit(createRuntimeStore(), limit) }
  function providerHealthSnapshot() { return providerHealth.snapshot() }

  return {
    activeRun,
    approvalQueue,
    latestRun,
    approvalNotice,
    status,
    error,
    run,
    resume,
    continueRun,
    approvePending,
    invokeTool,
    recentRuns,
    audit,
    providerHealthSnapshot,
  }
}
