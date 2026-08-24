import type { ApprovalRequest, ApprovalDecision, LlmAction } from '../security/human-approval-gate'

export type LLMProvider = 'openrouter' | 'openai' | 'anthropic'
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type ToolRequest = { action: LlmAction; target: string; reason: string; payload?: unknown }
export type PendingAction = { request: ApprovalRequest; decision?: ApprovalDecision }
export type ActiveModel = { provider: LLMProvider; model: string; free: boolean }
export type AgentTurn = { answer: string; activeModel?: ActiveModel; pending?: PendingAction[] }
