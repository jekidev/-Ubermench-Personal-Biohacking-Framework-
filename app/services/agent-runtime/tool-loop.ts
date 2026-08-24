import { createDefaultToolGateway } from './tool-gateway'
import type { AgentRun, AgentObservation, AgentToolCall } from './types'
import type { AgentTask } from '~/services/agent-superstack/types'

const DEFAULT_MAX_TOOL_CALLS = 8

export interface ToolLoopResult {
  run: AgentRun
  executed: number
}

export async function executeApprovedToolCalls(task: AgentTask, run: AgentRun, calls: AgentToolCall[], maxToolCalls = DEFAULT_MAX_TOOL_CALLS): Promise<ToolLoopResult> {
  const gateway = createDefaultToolGateway()
  const bounded = calls.slice(0, Math.max(0, Math.min(maxToolCalls, DEFAULT_MAX_TOOL_CALLS)))
  let executed = 0

  for (const call of bounded) {
    run.toolCalls.push(call)
    run.status = call.requiresApproval || gateway.get(call.name)?.requiresApproval ? 'waiting-approval' : 'executing'
    try {
      const result = await (call.requiresApproval || gateway.get(call.name)?.requiresApproval
        ? gateway.executeApproved(task, call)
        : gateway.execute(task, call))
      const observation: AgentObservation = {
        toolCallId: call.id,
        kind: 'tool',
        text: typeof result === 'string' ? result : JSON.stringify(result),
        createdAt: new Date().toISOString(),
      }
      run.observations.push(observation)
      executed += 1
      run.status = 'executing'
    } catch (error) {
      run.status = 'failed'
      run.error = error instanceof Error ? error.message : String(error)
      run.observations.push({ toolCallId: call.id, kind: 'system', text: run.error, createdAt: new Date().toISOString() })
      throw error
    }
  }

  return { run, executed }
}
