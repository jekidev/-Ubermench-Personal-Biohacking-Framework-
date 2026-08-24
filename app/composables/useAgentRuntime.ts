import { runAgentTask, continueAgentWithTools } from '~/services/agent-runtime/runtime'
import { createRuntimeStore } from '~/services/agent-runtime/store'
import { issueNativeMcpApproval } from '~/services/agent-runtime/native-mcp'
import type { AgentTask } from '~/services/agent-superstack/types'
import type { AgentRun, AgentToolCall } from '~/services/agent-runtime/types'

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

  async function approveNativeMcpCall(task: AgentTask, call: AgentToolCall) {
    if (call.name !== 'mcp.stdio') throw new Error('Only mcp.stdio calls can use the native approval helper.')
    const command = typeof call.args.command === 'string' ? call.args.command : ''
    const args = Array.isArray(call.args.args) && call.args.args.every((value) => typeof value === 'string') ? call.args.args as string[] : []
    const approval = await issueNativeMcpApproval(command, args)
    call.approvalToken = approval.token
    if (!activeRun.value) throw new Error('No active agent run is available for continuation.')
    status.value = 'running'
    error.value = null
    try {
      activeRun.value = await continueAgentWithTools(task, activeRun.value, [call])
      status.value = 'idle'
      return activeRun.value
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      status.value = 'error'
      throw cause
    }
  }

  async function recentRuns(limit = 20) { return createRuntimeStore().loadRuns(limit) }

  return { activeRun, status, error, run, approveNativeMcpCall, recentRuns }
}
