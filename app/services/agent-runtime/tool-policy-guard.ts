import {
  canRunTool,
  EXECUTE_TOOL_POLICY,
  WRITE_TOOL_POLICY,
  type ToolPolicy,
} from '../../../plugins/llm/security/tool-policy'
import { loadLLMSettings } from '~/services/llm-orchestrator'
import type { AgentTool } from './types'

export type RuntimeHost = 'web' | 'tauri'

export function detectRuntimeHost(): RuntimeHost {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) return 'tauri'
  return 'web'
}

export function policyForToolName(name: string): ToolPolicy | null {
  if (name === 'framework.write_file' || name === 'framework_write_file') return WRITE_TOOL_POLICY
  if (name === 'framework.run_command' || name === 'framework_run_command') return EXECUTE_TOOL_POLICY
  return null
}

function effectivePolicy(name: string): ToolPolicy | null {
  const base = policyForToolName(name)
  if (!base) return null
  const settings = loadLLMSettings()
  if (name === 'framework.write_file' || name === 'framework_write_file') {
    return { ...base, enabled: settings.allowFrameworkWrite }
  }
  if (name === 'framework.run_command' || name === 'framework_run_command') {
    return { ...base, enabled: true }
  }
  return base
}

export function assertToolPolicyAllowed(
  tool: AgentTool,
  approved: boolean,
  runtime: RuntimeHost = detectRuntimeHost(),
): void {
  const policy = effectivePolicy(tool.name)
  if (!policy) return
  if (!canRunTool(policy, runtime, approved)) {
    throw new Error(`Tool ${tool.name} is blocked by policy (enabled=${policy.enabled}, tauri=${policy.requiresNativeTauri}).`)
  }
}
