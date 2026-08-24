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

export interface AgentAuditEvent {
  id: string
  runId: string
  type: 'run.started' | 'policy.blocked' | 'model.completed' | 'tool.requested' | 'tool.completed' | 'tool.blocked' | 'run.completed' | 'run.failed' | 'recovery.retry'
  detail: string
  createdAt: string
  metadata?: Record<string, unknown>
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
  retryCount?: number
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
  findRunByTaskId(taskId: string): Promise<AgentRun | undefined>
  appendAudit(event: AgentAuditEvent): Promise<void>
  loadAudit(limit?: number): Promise<AgentAuditEvent[]>
}
