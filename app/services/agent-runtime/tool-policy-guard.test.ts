import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentTool } from './types'

const { loadLLMSettings } = vi.hoisted(() => ({
  loadLLMSettings: vi.fn(),
}))

vi.mock('~/services/llm-orchestrator', () => ({ loadLLMSettings }))

import { assertToolPolicyAllowed, policyForToolName } from './tool-policy-guard'

const writeTool: AgentTool = {
  name: 'framework.write_file',
  description: 'write',
  risk: 'high',
  requiresApproval: true,
  async execute() { return 'ok' },
}

const runTool: AgentTool = {
  name: 'framework.run_command',
  description: 'run',
  risk: 'high',
  requiresApproval: true,
  async execute() { return 'ok' },
}

describe('tool policy guard', () => {
  beforeEach(() => {
    loadLLMSettings.mockReset()
    loadLLMSettings.mockReturnValue({ allowFrameworkWrite: false })
  })

  it('blocks write tools when disabled and unapproved', () => {
    expect(() => assertToolPolicyAllowed(writeTool, false, 'web')).toThrow('blocked by policy')
  })

  it('blocks write tools on Tauri until allowFrameworkWrite is enabled', () => {
    expect(() => assertToolPolicyAllowed(writeTool, true, 'tauri')).toThrow('blocked by policy')
    loadLLMSettings.mockReturnValue({ allowFrameworkWrite: true })
    expect(() => assertToolPolicyAllowed(writeTool, true, 'tauri')).not.toThrow()
  })

  it('requires approval for framework.run_command on Tauri', () => {
    expect(policyForToolName('framework.run_command')?.requiresExplicitApproval).toBe(true)
    expect(() => assertToolPolicyAllowed(runTool, false, 'tauri')).toThrow('blocked by policy')
    expect(() => assertToolPolicyAllowed(runTool, true, 'tauri')).not.toThrow()
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
