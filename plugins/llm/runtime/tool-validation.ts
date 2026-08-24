import type { LlmAction } from '../security/human-approval-gate'

export type RawToolCall = {
  action?: unknown
  target?: unknown
  reason?: unknown
  payload?: unknown
}

export function parseToolRequest(input: RawToolCall): { action: LlmAction; target: string; reason: string; payload?: unknown } {
  const actions: readonly LlmAction[] = ['network-search', 'scrape', 'rag-read', 'create', 'update', 'delete', 'send', 'store', 'execute']
  if (typeof input.action !== 'string' || !actions.includes(input.action as LlmAction)) throw new Error('Malformed tool call: invalid action.')
  if (typeof input.target !== 'string' || input.target.trim() === '') throw new Error('Malformed tool call: invalid target.')
  if (typeof input.reason !== 'string' || input.reason.trim() === '') throw new Error('Malformed tool call: missing reason.')
  return { action: input.action as LlmAction, target: input.target, reason: input.reason, payload: input.payload }
}
