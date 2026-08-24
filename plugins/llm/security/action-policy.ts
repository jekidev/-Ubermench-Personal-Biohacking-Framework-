import { assertApproved, type ApprovalDecision, type LlmAction } from './human-approval-gate'

export type ActionContext = {
  decision?: ApprovalDecision
  tauriRuntime?: boolean
  payload?: unknown
}

/** Central fail-closed enforcement point for every LLM capability. */
export function authorizeLlmAction(action: LlmAction, context: ActionContext): void {
  if (!context.tauriRuntime && ['create', 'update', 'delete', 'send', 'store', 'execute'].includes(action)) {
    throw new Error(`LLM action blocked: ${action} requires the Tauri runtime.`)
  }
  assertApproved(context.decision)
}

export const destructiveActions: readonly LlmAction[] = ['delete', 'update', 'create', 'send', 'store', 'execute']
export const retrievalActions: readonly LlmAction[] = ['network-search', 'scrape', 'rag-read']
