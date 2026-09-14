import { canonicalizeHealthConnectSample } from '../../app/services/health-connect-metrics'

export type HealthConnectPermissionStatus = {
  available: boolean
  installed: boolean
  granted: string[]
  missing: string[]
}

export type HealthConnectSamplePayload = {
  id: string
  metric: string
  value: number
  unit: string
  recordedAt: string
  metadata?: Record<string, unknown>
}

export type HealthConnectSyncResult = {
  samples: HealthConnectSamplePayload[]
  cursor?: string
  warnings: string[]
}

export const HEALTH_CONNECT_PLUGIN = 'health-connect'

const HEALTH_CONNECT_COMMANDS = {
  isAvailable: 'health_connect_is_available',
  requestPermissions: 'health_connect_request_permissions',
  getPermissionStatus: 'health_connect_get_permission_status',
  syncRecords: 'health_connect_sync_records',
} as const

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

function normalizePermissionStatus(raw: unknown): HealthConnectPermissionStatus {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  return {
    available: Boolean(record.available),
    installed: Boolean(record.installed),
    granted: asStringList(record.granted),
    missing: asStringList(record.missing),
  }
}

function normalizeSyncResult(raw: unknown): HealthConnectSyncResult {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const samples = Array.isArray(record.samples)
    ? record.samples
      .filter((item): item is HealthConnectSamplePayload => Boolean(item && typeof item === 'object'))
      .map((item) => canonicalizeHealthConnectSample({
        id: String(item.id),
        metric: String(item.metric),
        value: Number(item.value),
        unit: String(item.unit ?? ''),
        recordedAt: String(item.recordedAt),
        metadata: item.metadata,
      }))
    : []
  return {
    samples,
    cursor: typeof record.cursor === 'string' ? record.cursor : undefined,
    warnings: asStringList(record.warnings),
  }
}

export function healthConnectCommandNames(command: string): string[] {
  return [`plugin:${HEALTH_CONNECT_PLUGIN}|${command}`, command]
}

async function invokeHealthConnect<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  let lastError: unknown
  for (const name of healthConnectCommandNames(command)) {
    try {
      return await invoke<T>(name, args)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Health Connect is not available in this runtime.')
}

export async function healthConnectIsNativeAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return false
  try {
    const result = normalizePermissionStatus(await invokeHealthConnect(HEALTH_CONNECT_COMMANDS.isAvailable))
    return result.available || result.installed
  } catch {
    return false
  }
}

export async function healthConnectGetPermissionStatus(): Promise<HealthConnectPermissionStatus> {
  return normalizePermissionStatus(await invokeHealthConnect(HEALTH_CONNECT_COMMANDS.getPermissionStatus))
}

export async function healthConnectRequestPermissions(): Promise<HealthConnectPermissionStatus> {
  return normalizePermissionStatus(await invokeHealthConnect(HEALTH_CONNECT_COMMANDS.requestPermissions))
}

export async function healthConnectSyncRecords(from?: string, to?: string): Promise<HealthConnectSyncResult> {
  return normalizeSyncResult(await invokeHealthConnect(HEALTH_CONNECT_COMMANDS.syncRecords, { from, to }))
}
