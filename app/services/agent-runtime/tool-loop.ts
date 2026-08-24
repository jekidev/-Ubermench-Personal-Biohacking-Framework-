import { createDefaultToolGateway } from './tool-gateway'
import type { AgentRun, AgentObservation, AgentToolCall } from './types'
import type { AgentTask } from '~/services/agent-superstack/types'
import { validateToolResult } from './tool-result-validation'
import { redactSecrets } from './secret-redaction'

const DEFAULT_MAX_TOOL_CALLS = 8
const runQueues = new WeakMap<AgentRun, Promise<void>>()

export interface ToolLoopResult {
  run: AgentRun
  executed: number
}

export function executeApprovedToolCalls(
  task: AgentTask,
  run: AgentRun,
  calls: AgentToolCall[],
  maxToolCalls = DEFAULT_MAX_TOOL_CALLS,
): Promise<ToolLoopResult> {
  const previous = runQueues.get(run) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(async () => {
    const gateway = createDefaultToolGateway()
    const bounded = calls.slice(0, Math.max(0, Math.min(maxToolCalls, DEFAULT_MAX_TOOL_CALLS)))
    let executed = 0

    for (const call of bounded) {
      if (run.toolCalls.some((existing) => existing.id === call.id)) continue
      run.toolCalls.push(call)
      run.status = call.requiresApproval || gateway.get(call.name)?.requiresApproval ? 'waiting-approval' : 'executing'
      try {
        const result = await (call.requiresApproval || gateway.get(call.name)?.requiresApproval
          ? gateway.executeApproved(task, call)
          : gateway.execute(task, call))
        const validated = validateToolResult(result)
        const observation: AgentObservation = {
          toolCallId: call.id,
          kind: 'tool',
          text: validated.serialized,
          createdAt: new Date().toISOString(),
        }
        run.observations.push(observation)
        executed += 1
        run.status = 'executing'
      } catch (error) {
        run.status = 'failed'
        run.error = String(redactSecrets(error instanceof Error ? error.message : String(error)))
        run.observations.push({ toolCallId: call.id, kind: 'system', text: run.error, createdAt: new Date().toISOString() })
        throw error
      }
    }

    return { run, executed }
  })
  runQueues.set(run, current.then(() => undefined, () => undefined))
  return current
}
