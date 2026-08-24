import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, EXECUTE_TOOL_POLICY, RETRIEVAL_TOOL_POLICY, WRITE_TOOL_POLICY, canRunTool } from './tool-policy'

describe('tool policy', () => {
  it('allows pure local reads without approval', () => {
    expect(canRunTool(DEFAULT_TOOL_POLICY, 'web', false)).toBe(true)
  })

  it('blocks retrieval without approval', () => {
    expect(canRunTool(RETRIEVAL_TOOL_POLICY, 'web', false)).toBe(false)
    expect(canRunTool(RETRIEVAL_TOOL_POLICY, 'web', true)).toBe(true)
  })

  it('blocks writes by default and outside Tauri', () => {
    expect(canRunTool(WRITE_TOOL_POLICY, 'tauri', true)).toBe(false)
    expect(canRunTool({ ...WRITE_TOOL_POLICY, enabled: true }, 'web', true)).toBe(false)
  })

  it('blocks execution by default', () => {
    expect(canRunTool(EXECUTE_TOOL_POLICY, 'tauri', true)).toBe(false)
  })
})
