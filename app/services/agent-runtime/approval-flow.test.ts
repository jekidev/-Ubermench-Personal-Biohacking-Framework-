import { describe, expect, it } from 'vitest'
import { AgentToolGateway } from './tool-gateway'
import type { AgentTask } from '~/services/agent-superstack/types'

describe('native approval boundary', () => {
  const task: AgentTask = { id: 'task', kind: 'coding', prompt: 'run tool', allowTools: true, riskLevel: 'high' }

  it('does not permit approval-required tools without an approval token', async () => {
    const gateway = new AgentToolGateway()
    gateway.register({ name: 'sensitive', description: 'sensitive', risk: 'high', requiresApproval: true, async execute() { return 'executed' } })
    await expect(gateway.executeApproved(task, { id: 'call', name: 'sensitive', args: {}, requiresApproval: true })).rejects.toThrow('approval token')
  })
})
