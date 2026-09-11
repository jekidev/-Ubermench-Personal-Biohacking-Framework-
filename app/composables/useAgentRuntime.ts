import { recentAudit } from '~/services/agent-runtime/audit'
import { invokeCatalogTool } from '~/services/agent-runtime/invoke-tool'
import { continueAgentWithTools, runAgentTask } from '~/services/agent-runtime/runtime'
import { pendingAgentToolCalls } from '~/services/agent-runtime/run-reply'
import { createRuntimeStore } from '~/services/agent-runtime/store'
import type { AgentTask } from '~/services/agent-superstack/types'
import type { AgentRun, AgentToolCall } from '~/services/agent-runtime/types'
import { providerHealth } from '~/services/agent-runtime/provider-health'

export function useAgentRuntime() {
  const activeRun = useState<AgentRun | null>('ubermench-agent-active-run', () => null)
  const status = useState<'idle' | 'running' | 'error'>('ubermench-agent-runtime-status', () => 'idle')
  const error = useState<string | null>('ubermench-agent-runtime-error', () => null)

  async function run(task: AgentTask) {
    status.value = 'running'
    error.value = null
    try {
      activeRun.value = await runAgentTask(task)
      status.value = 'idle'
      return activeRun.value
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
      activeRun.value = await continueAgentWithTools(task, runRecord, calls)
      status.value = 'idle'
      return activeRun.value
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
      return continueRun(task, existing, pending.map((call) => ({ ...call, approvalToken: token })))
    }
    return run(task)
  }

  async function approvePending(approvalToken?: string) {
    const run = activeRun.value
    if (!run) throw new Error('No active agent run to approve.')
    const pending = pendingAgentToolCalls(run)
    if (!pending.length) return run
    const token = approvalToken?.trim() || `user-approved-${Date.now()}`
    return continueRun(run.task, run, pending.map((call) => ({ ...call, approvalToken: token })))
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

  return { activeRun, status, error, run, resume, continueRun, approvePending, invokeTool, recentRuns, audit, providerHealthSnapshot }
}
