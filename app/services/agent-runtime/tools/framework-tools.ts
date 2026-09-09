import { invoke } from '@tauri-apps/api/core'
import { loadLLMSettings } from '~/services/llm-orchestrator'
import type { AgentTool } from '../types'

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function assertTauriRuntime(): void {
  if (!isTauriRuntime()) {
    throw new Error('Framework tools are available only in the Tauri desktop runtime.')
  }
}

function assertFrameworkWriteEnabled(): void {
  if (!loadLLMSettings().allowFrameworkWrite) {
    throw new Error('Framework write access is disabled in Settings.')
  }
}

export function createFrameworkTools(): AgentTool[] {
  return [
    {
      name: 'framework.snapshot',
      description: 'Return a structured overview of the local framework repository.',
      risk: 'low',
      requiresApproval: false,
      async execute() {
        assertTauriRuntime()
        return invoke('framework_snapshot')
      },
    },
    {
      name: 'framework.search',
      description: 'Search framework source files for a term.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        assertTauriRuntime()
        const query = typeof args.query === 'string' ? args.query : ''
        const limit = typeof args.limit === 'number' ? args.limit : 40
        return invoke('framework_search', { query, limit })
      },
    },
    {
      name: 'framework.read_file',
      description: 'Read a UTF-8 file from the framework repository.',
      risk: 'low',
      requiresApproval: false,
      async execute(args) {
        assertTauriRuntime()
        const path = typeof args.path === 'string' ? args.path : ''
        const maxBytes = typeof args.maxBytes === 'number' ? args.maxBytes : 100_000
        return invoke('framework_read_file', { path, maxBytes })
      },
    },
    {
      name: 'framework.write_file',
      description: 'Create or replace a framework file. Requires allowFrameworkWrite in Settings.',
      risk: 'high',
      requiresApproval: true,
      async execute(args) {
        assertTauriRuntime()
        assertFrameworkWriteEnabled()
        const path = typeof args.path === 'string' ? args.path : ''
        const content = typeof args.content === 'string' ? args.content : ''
        return invoke('framework_write_file', { path, content })
      },
    },
    {
      name: 'framework.run_command',
      description: 'Run an allowlisted project command (npm, pnpm, cargo, bun).',
      risk: 'high',
      requiresApproval: true,
      async execute(args) {
        assertTauriRuntime()
        const command = typeof args.command === 'string' ? args.command : ''
        const commandArgs = Array.isArray(args.args) && args.args.every((value) => typeof value === 'string')
          ? args.args as string[]
          : []
        return invoke('framework_run_command', { command, args: commandArgs })
      },
    },
  ]
}
