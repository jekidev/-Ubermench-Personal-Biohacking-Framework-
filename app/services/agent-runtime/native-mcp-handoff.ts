import { detectProductRuntime, isAndroidProduct, type ProductRuntime } from '~/utils/runtime-platform'
import {
  ANDROID_RESEARCH_HREF,
  formatAndroidNativeHandoff,
  nativeMcpHandoffCta,
  nativeMcpUnavailableMessage,
} from '../android-fallbacks'
import { nextNativePreflightTarget } from './mcp-server-tools'
import type { AgentToolCall } from './types'

export const NATIVE_MCP_AGENT_PATH = '/agent'
export const NATIVE_MCP_TAURI_MESSAGE = nativeMcpUnavailableMessage('browser')
export const NATIVE_MCP_ANDROID_MESSAGE = nativeMcpUnavailableMessage('android-browser')

export type NativeMcpAgentQuery = {
  native: string
  command: string
  args: string[]
}

function readQueryValue(query: Record<string, unknown>, key: string): string {
  const value = query[key]
  if (Array.isArray(value)) return String(value[0] ?? '')
  return typeof value === 'string' ? value : ''
}

export function nativeMcpAgentQuery(calls: AgentToolCall[]): Record<string, string> {
  const next = nextNativePreflightTarget(calls)
  if (!next) return {}
  return {
    native: next.name,
    command: next.command,
    args: next.args.join(' '),
  }
}

export function nativeMcpAgentHref(
  calls: AgentToolCall[],
  runtime: ProductRuntime = detectProductRuntime(),
): string {
  if (isAndroidProduct(runtime)) return ANDROID_RESEARCH_HREF
  const query = nativeMcpAgentQuery(calls)
  if (!Object.keys(query).length) return NATIVE_MCP_AGENT_PATH
  return `${NATIVE_MCP_AGENT_PATH}?${new URLSearchParams(query).toString()}`
}

export function nativeMcpContinueCta(runtime: ProductRuntime = detectProductRuntime()): string {
  return nativeMcpHandoffCta(runtime)
}

export function parseNativeMcpAgentQuery(query: Record<string, unknown> | null | undefined): NativeMcpAgentQuery | null {
  if (!query) return null
  const native = readQueryValue(query, 'native').trim()
  const command = readQueryValue(query, 'command').trim()
  const argsRaw = readQueryValue(query, 'args').trim()
  if (!native && !command) return null
  return {
    native,
    command: command || 'uvx',
    args: argsRaw ? argsRaw.split(/\s+/).filter(Boolean) : [],
  }
}

export function formatNativeMcpPendingCopy(
  calls: AgentToolCall[],
  runtime: ProductRuntime = detectProductRuntime(),
): string {
  const names = calls.map((call) => call.name).join(', ')
  if (isAndroidProduct(runtime)) {
    return formatAndroidNativeHandoff(names, runtime)
  }
  return nativeMcpUnavailableMessage(runtime)
}
