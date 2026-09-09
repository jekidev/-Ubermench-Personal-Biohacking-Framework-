export type ChatRule = {
  id: string
  name: string
  description: string
  prompt: string
  enabled: boolean
  category: 'safety' | 'evidence' | 'privacy' | 'style'
  custom?: boolean
}

export type ChatWorkflow = {
  id: string
  name: string
  description: string
  slash: string
  kind: 'research' | 'biohacking' | 'automation' | 'chat'
  enabled: boolean
  requiresConnector?: string
  synergy?: string[]
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  workflowId?: string
  modelLabel?: string
}

export type ChatSessionPreferences = {
  schemaVersion: 2
  enabledSkillIds: string[]
  enabledRuleIds: string[]
  enabledWorkflowIds: string[]
  showStackSynergy: boolean
  includeRagContext: boolean
}

export type ChatRunOptions = {
  enabledSkillIds?: string[]
  enabledRuleIds?: string[]
  enabledWorkflowIds?: string[]
  showStackSynergy?: boolean
  includeRagContext?: boolean
  workflowId?: string
  conversationHistory?: string
  ragContext?: string
}

export type SlashCommandResult = {
  prompt: string
  workflowId?: string
  kind?: 'research' | 'biohacking' | 'automation' | 'chat' | 'coding'
  handled: boolean
  message?: string
}
