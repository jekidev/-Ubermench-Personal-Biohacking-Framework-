import { describe, expect, it } from 'vitest'
import { AgentRuntimeStateMachine } from './runtime-state'

describe('agent runtime state machine', () => {
  it('allows the normal execution lifecycle', () => {
    const machine = new AgentRuntimeStateMachine()
    expect(machine.transition('planning')).toBe('planning')
    expect(machine.transition('executing')).toBe('executing')
    expect(machine.transition('observing')).toBe('observing')
    expect(machine.transition('completed')).toBe('completed')
  })

  it('requires explicit approval before returning to execution', () => {
    const machine = new AgentRuntimeStateMachine()
    machine.transition('planning')
    machine.transition('waiting-approval')
    expect(() => machine.transition('observing')).toThrow('Invalid agent runtime transition')
    expect(machine.transition('executing')).toBe('executing')
  })

  it('bounds failure recovery', () => {
    const machine = new AgentRuntimeStateMachine()
    machine.transition('planning')
    machine.transition('failed')
    expect(machine.transition('recovering')).toBe('recovering')
    expect(machine.transition('executing')).toBe('executing')
    expect(() => machine.transition('planning')).toThrow('Invalid agent runtime transition')
  })
})
