export type LLMProvider = 'openrouter' | 'openai' | 'anthropic'

export interface ProviderConfig {
  id: LLMProvider
  label: string
  baseUrl: string
  enabled: boolean
  apiKeyPresent: boolean
  model?: string
}

export interface ActiveModel {
  provider: LLMProvider
  model: string
  displayName: string
  free: boolean
}

export interface LLMTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_name?: string
}

export interface ChatResult {
  content: string
  activeModel: ActiveModel
  toolCalls?: ToolCall[]
  usage?: Record<string, unknown>
}
