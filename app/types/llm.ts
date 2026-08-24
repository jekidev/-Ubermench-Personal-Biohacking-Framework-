export type LLMProvider = 'openrouter' | 'openai' | 'anthropic' | 'huggingface'
export type LLMMode = 'researcher' | 'clinician' | 'biohacker' | 'coach' | 'scientist' | 'auditor' | 'safety'

export interface LLMProviderConfig {
  provider: LLMProvider
  apiKey?: string
  model?: string
  enabled: boolean
  priority: number
  baseUrl?: string
}

export interface LLMRequest {
  prompt: string
  system?: string
  mode?: LLMMode
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface LLMResponse {
  id: string
  provider: LLMProvider
  model: string
  text: string
  latencyMs: number
  attempts: number
  fallbackUsed: boolean
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
  raw?: unknown
}

export interface LLMSettings {
  providers: LLMProviderConfig[]
  preferFree: boolean
  autoRotate: boolean
  showModel: boolean
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  providers: [
    { provider: 'openrouter', model: 'openrouter/free', enabled: true, priority: 1 },
    { provider: 'openai', model: 'gpt-5.6', enabled: true, priority: 2 },
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514', enabled: true, priority: 3 },
    { provider: 'huggingface', enabled: false, priority: 4 },
  ],
  preferFree: true,
  autoRotate: true,
  showModel: true,
}
