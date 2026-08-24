import { describe, expect, it } from 'vitest'
import { AgentToolGateway } from './tool-gateway'
import type { AgentTask } from '~/services/agent-superstack/types'

const task: AgentTask = {
  id: 't1',
  kind: 'coding',
  prompt: 'inspect local code',
  allowTools: true,
  riskLevel: 'low',
}

describe('AgentToolGateway', () => {
  it('executes a low-risk approved-by-policy tool', async () => {
    const gateway = new AgentToolGateway()
    gateway.register({ name: 'echo', description: 'test', risk: 'low', requiresApproval: false, async execute(args) { return args } })
    await expect(gateway.execute(task, { id: 'c1', name: 'echo', args: { value: 1 } })).resolves.toEqual({ value: 1 })
  })

  it('fails closed for tools requiring explicit approval', async () => {
    const gateway = new AgentToolGateway()
    gateway.register({ name: 'danger', description: 'test', risk: 'high', requiresApproval: true, async execute() { return 'should-not-run' } })
    await expect(gateway.execute({ ...task, riskLevel: 'high' }, { id: 'c2', name: 'danger', args: {} })).rejects.toThrow('requires explicit approval')
  })

  it('does not execute unknown tools', async () => {
    const gateway = new AgentToolGateway()
    await expect(gateway.execute(task, { id: 'c3', name: 'missing', args: {} })).rejects.toThrow('Unknown agent tool')
  })
})
