import type { AgentRun } from './types'

export type CheckpointPhase = AgentRun['status']

export interface AgentCheckpoint {
  runId: string
  taskId: string
  phase: CheckpointPhase
  sequence: number
  updatedAt: string
  run: AgentRun
}

export function createCheckpoint(run: AgentRun, sequence: number): AgentCheckpoint {
  return {
    runId: run.id,
    taskId: run.task.id,
    phase: run.status,
    sequence,
    updatedAt: new Date().toISOString(),
    run: structuredClone(run),
  }
}

export function shouldResume(checkpoint: AgentCheckpoint | undefined): boolean {
  if (!checkpoint) return false
  return checkpoint.phase === 'planning' || checkpoint.phase === 'executing' || checkpoint.phase === 'observing' || checkpoint.phase === 'waiting-approval' || checkpoint.phase === 'recovering'
}
