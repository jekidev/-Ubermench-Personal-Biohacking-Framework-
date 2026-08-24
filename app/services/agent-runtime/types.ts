import type { AgentContext, AgentTask, MemoryRecord, ModelEndpoint } from '~/services/agent-superstack/types'

export type AgentRunStatus = 'queued' | 'planning' | 'executing' | 'waiting-approval' | 'completed' | 'failed'

export interface AgentToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  requiresApproval?: boolean
  approvalToken?: string
}

export interface AgentObservation {
  toolCallId?: string
  kind: 'model' | 'tool' | 'system'
  text: string
  createdAt: string
}

export interface AgentRun {
  id: string
  task: AgentTask
  status: AgentRunStatus
  context: AgentContext
  observations: AgentObservation[]
  toolCalls: AgentToolCall[]
  selectedModel?: ModelEndpoint
  startedAt: string
  completedAt?: string
  error?: string
}

export interface AgentTool {
  name: string
  description: string
  risk: 'low' | 'medium' | 'high'
  requiresApproval: boolean
  execute(args: Record<string, unknown>): Promise<unknown>
}

export interface RuntimeStore {
  loadMemory(): Promise<MemoryRecord[]>
  saveMemory(records: MemoryRecord[]): Promise<void>
  appendRun(run: AgentRun): Promise<void>
  loadRuns(limit?: number): Promise<AgentRun[]>
}
