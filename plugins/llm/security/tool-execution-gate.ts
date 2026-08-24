import type { ApprovalToken } from './approval-token'
import { consumeApprovalToken } from './approval-token'
import { authorizeLlmAction } from './action-policy'
import type { LlmAction } from './human-approval-gate'

export type ToolExecutionContext = {
  runtime: 'web' | 'tauri'
  token?: ApprovalToken
}

type ToolHandler<T> = () => Promise<T>

/** Single execution choke-point for future LLM/MCP tools. */
export async function executeApprovedTool<T>(
  action: LlmAction,
  target: string,
  payload: unknown,
  context: ToolExecutionContext,
  handler: ToolHandler<T>,
): Promise<T> {
  if (!context.token) throw new Error('Tool execution blocked: explicit user approval is required.')

  if (['create', 'update', 'delete', 'send', 'store', 'execute'].includes(action) && context.runtime !== 'tauri') {
    throw new Error(`Tool execution blocked: ${action} requires the Tauri runtime.`)
  }

  authorizeLlmAction(action, {
    decision: 'approved',
    tauriRuntime: context.runtime === 'tauri',
    payload,
  })

  await consumeApprovalToken(context.token, action, target, payload)
  return handler()
}
