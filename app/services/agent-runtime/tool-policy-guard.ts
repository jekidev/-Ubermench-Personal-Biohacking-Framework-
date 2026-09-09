import {
  canRunTool,
  EXECUTE_TOOL_POLICY,
  WRITE_TOOL_POLICY,
  type ToolPolicy,
} from '../../../plugins/llm/security/tool-policy'
import type { AgentTool } from './types'

export type RuntimeHost = 'web' | 'tauri'

export function detectRuntimeHost(): RuntimeHost {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) return 'tauri'
  return 'web'
}

export function policyForToolName(name: string): ToolPolicy | null {
  if (name.startsWith('framework.write') || name === 'framework_write_file') return WRITE_TOOL_POLICY
  if (name.startsWith('framework.run') || name === 'framework_run_command') return EXECUTE_TOOL_POLICY
  return null
}

export function assertToolPolicyAllowed(
  tool: AgentTool,
  approved: boolean,
  runtime: RuntimeHost = detectRuntimeHost(),
): void {
  const policy = policyForToolName(tool.name)
  if (!policy) return
  if (!canRunTool(policy, runtime, approved)) {
    throw new Error(`Tool ${tool.name} is blocked by policy (enabled=${policy.enabled}, tauri=${policy.requiresNativeTauri}).`)
  }
}
