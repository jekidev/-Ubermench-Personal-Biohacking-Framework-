export type AgentRuntimeState =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'waiting-approval'
  | 'observing'
  | 'recovering'
  | 'completed'
  | 'failed'

const transitions: Record<AgentRuntimeState, AgentRuntimeState[]> = {
  idle: ['planning'],
  planning: ['executing', 'waiting-approval', 'failed'],
  executing: ['observing', 'waiting-approval', 'recovering', 'failed'],
  'waiting-approval': ['executing', 'failed'],
  observing: ['planning', 'completed', 'failed'],
  recovering: ['executing', 'failed'],
  completed: ['planning', 'idle'],
  failed: ['recovering', 'idle'],
}

export class AgentRuntimeStateMachine {
  private current: AgentRuntimeState = 'idle'

  get state(): AgentRuntimeState {
    return this.current
  }

  canTransition(next: AgentRuntimeState): boolean {
    return transitions[this.current].includes(next)
  }

  transition(next: AgentRuntimeState): AgentRuntimeState {
    if (!this.canTransition(next)) {
      throw new Error(`Invalid agent runtime transition: ${this.current} -> ${next}`)
    }
    this.current = next
    return this.current
  }

  reset(): void {
    this.current = 'idle'
  }
}
