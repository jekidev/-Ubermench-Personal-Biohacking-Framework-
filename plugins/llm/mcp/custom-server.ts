import type { McpServerRegistryEntry } from './servers'
import { getMcpServer } from './servers'

export const CUSTOM_MCP_EXECUTABLES = ['npx', 'node'] as const

const SERVER_ID_PATTERN = /^[a-z][a-z0-9-]{1,40}$/
const ENV_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,80}$/
const FORBIDDEN_ARG = /[;&|`$<>\\\n\r]/

export type CustomMcpInstallInput = {
  serverId: string
  executable: string
  args: string[]
  envKeys?: string[]
  description?: string
  userConfirmed?: boolean
}

export function assertCatalogInstallAllowed(serverId: string): void {
  if (!getMcpServer(serverId)) {
    throw new Error(`MCP server is not in the allowlisted catalog: ${serverId}`)
  }
}

export function validateCustomMcpServer(input: CustomMcpInstallInput): McpServerRegistryEntry {
  if (!input.userConfirmed) {
    throw new Error('Custom MCP install requires explicit user confirmation.')
  }
  if (!SERVER_ID_PATTERN.test(input.serverId)) {
    throw new Error('Custom MCP serverId must be lowercase kebab-case (2-41 chars).')
  }
  if (getMcpServer(input.serverId)) {
    throw new Error('Custom MCP serverId collides with the allowlisted catalog.')
  }
  if (!CUSTOM_MCP_EXECUTABLES.includes(input.executable as typeof CUSTOM_MCP_EXECUTABLES[number])) {
    throw new Error(`Custom MCP executable must be one of: ${CUSTOM_MCP_EXECUTABLES.join(', ')}`)
  }
  if (!input.args.length) {
    throw new Error('Custom MCP server requires at least one argument.')
  }
  if (input.args.some((arg) => !arg.trim() || FORBIDDEN_ARG.test(arg))) {
    throw new Error('Custom MCP arguments contain unsupported characters.')
  }
  const envKeys = input.envKeys ?? []
  if (envKeys.some((key) => !ENV_KEY_PATTERN.test(key))) {
    throw new Error('Custom MCP env keys must be uppercase names only — never secret values.')
  }
  return {
    serverId: input.serverId,
    executable: input.executable,
    allowedArgs: input.args,
    description: input.description?.trim() || `Custom MCP server ${input.serverId}`,
    enabledByDefault: true,
    auth: envKeys.length ? 'env' : 'approval',
    envKeys,
  }
}
