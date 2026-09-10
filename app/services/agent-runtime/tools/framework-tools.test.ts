import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke, loadLLMSettings } = vi.hoisted(() => ({
  invoke: vi.fn(),
  loadLLMSettings: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke }))
vi.mock('~/services/llm-orchestrator', () => ({ loadLLMSettings }))

import { createFrameworkTools } from './framework-tools'

function tool(name: string) {
  const match = createFrameworkTools().find((entry) => entry.name === name)
  if (!match) throw new Error(`Missing tool: ${name}`)
  return match
}

describe('framework tools', () => {
  beforeEach(() => {
    invoke.mockReset()
    loadLLMSettings.mockReset()
    loadLLMSettings.mockReturnValue({ allowFrameworkWrite: false })
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('blocks execution outside the Tauri runtime', async () => {
    await expect(tool('framework.snapshot').execute({})).rejects.toThrow('Tauri desktop runtime')
  })

  it('calls framework_snapshot in Tauri', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: { __TAURI_INTERNALS__: {} },
      configurable: true,
    })
    invoke.mockResolvedValue({ fileCount: 1, files: ['README.md'] })

    const result = await tool('framework.snapshot').execute({})
    expect(invoke).toHaveBeenCalledWith('framework_snapshot')
    expect(result).toEqual({ fileCount: 1, files: ['README.md'] })
  })

  it('requires allowFrameworkWrite before framework.write_file', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: { __TAURI_INTERNALS__: {} },
      configurable: true,
    })

    await expect(tool('framework.write_file').execute({ path: 'tmp.txt', content: 'x' }))
      .rejects.toThrow('Framework write access is disabled')

    loadLLMSettings.mockReturnValue({ allowFrameworkWrite: true })
    invoke.mockResolvedValue(undefined)
    await tool('framework.write_file').execute({ path: 'tmp.txt', content: 'hello' })
    expect(invoke).toHaveBeenCalledWith('framework_write_file', { path: 'tmp.txt', content: 'hello' })
  })

  it('forwards framework.run_command args to Tauri', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: { __TAURI_INTERNALS__: {} },
      configurable: true,
    })
    invoke.mockResolvedValue('ok')

    await tool('framework.run_command').execute({ command: 'npm', args: ['test'] })
    expect(invoke).toHaveBeenCalledWith('framework_run_command', { command: 'npm', args: ['test'] })
  })
})
