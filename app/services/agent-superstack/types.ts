export type AgentTaskKind = 'chat' | 'research' | 'biohacking' | 'coding' | 'automation'

export type ModelCapability = 'reasoning' | 'coding' | 'vision' | 'tools' | 'fast' | 'research'

export interface ModelEndpoint {
  id: string
  provider: string
  model: string
  baseUrl: string
  apiKey?: string
  capabilities: ModelCapability[]
  costTier: 'free' | 'low' | 'paid'
  enabled: boolean
  priority: number
}

export interface AgentTask {
  id: string
  kind: AgentTaskKind
  prompt: string
  requiredCapabilities?: ModelCapability[]
  allowTools?: boolean
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface MemoryRecord {
  id: string
  text: string
  type: 'episodic' | 'semantic' | 'preference' | 'fact' | 'decision'
  tags: string[]
  importance: number
  createdAt: number
  updatedAt: number
  accessCount: number
}

export interface AgentSkill {
  id: string
  name: string
  description: string
  triggers: string[]
  tools: string[]
  prompt?: string
  enabled: boolean
}

export interface PolicyDecision {
  allowed: boolean
  reason: string
  requiresConfirmation: boolean
}

export interface AgentContext {
  task: AgentTask
  memories: MemoryRecord[]
  skills: AgentSkill[]
  selectedModel?: ModelEndpoint
  policy: PolicyDecision
}
