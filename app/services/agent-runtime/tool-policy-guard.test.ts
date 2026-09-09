import { describe, expect, it } from 'vitest'
import { assertToolPolicyAllowed } from './tool-policy-guard'
import type { AgentTool } from './types'

const writeTool: AgentTool = {
  name: 'framework_write_file',
  description: 'write',
  risk: 'high',
  requiresApproval: true,
  async execute() { return 'ok' },
}

describe('tool policy guard', () => {
  it('blocks write tools when disabled and unapproved', () => {
    expect(() => assertToolPolicyAllowed(writeTool, false, 'web')).toThrow('blocked by policy')
  })

  it('allows read tools without extra policy', () => {
    const readTool: AgentTool = {
      name: 'memory.search',
      description: 'read',
      risk: 'low',
      requiresApproval: false,
      async execute() { return [] },
    }
    expect(() => assertToolPolicyAllowed(readTool, false, 'web')).not.toThrow()
  })
})
