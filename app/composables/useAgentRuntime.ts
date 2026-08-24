import { recentAudit } from '~/services/agent-runtime/audit'
import { runAgentTask } from '~/services/agent-runtime/runtime'
import { createRuntimeStore } from '~/services/agent-runtime/store'
import type { AgentTask } from '~/services/agent-superstack/types'
import type { AgentRun } from '~/services/agent-runtime/types'
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

  async function resume(task: AgentTask) {
    const existing = await createRuntimeStore().findRunByTaskId(task.id)
    if (!existing) throw new Error(`No recoverable run found for task ${task.id}.`)
    return run(task)
  }

  async function recentRuns(limit = 20) { return createRuntimeStore().loadRuns(limit) }
  async function audit(limit = 100) { return recentAudit(createRuntimeStore(), limit) }
  function providerHealthSnapshot() { return providerHealth.snapshot() }

  return { activeRun, status, error, run, resume, recentRuns, audit, providerHealthSnapshot }
}
