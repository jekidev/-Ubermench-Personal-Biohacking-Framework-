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

const HEALTH_CONNECT_COMMANDS = {
  isAvailable: 'health_connect_is_available',
  requestPermissions: 'health_connect_request_permissions',
  getPermissionStatus: 'health_connect_get_permission_status',
  syncRecords: 'health_connect_sync_records',
} as const

async function invokeHealthConnect<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(command, args)
}

export async function healthConnectIsNativeAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return false
  try {
    const result = await invokeHealthConnect<{ available: boolean }>(HEALTH_CONNECT_COMMANDS.isAvailable)
    return Boolean(result.available)
  } catch {
    return false
  }
}

export async function healthConnectGetPermissionStatus(): Promise<HealthConnectPermissionStatus> {
  return invokeHealthConnect<HealthConnectPermissionStatus>(HEALTH_CONNECT_COMMANDS.getPermissionStatus)
}

export async function healthConnectRequestPermissions(): Promise<HealthConnectPermissionStatus> {
  return invokeHealthConnect<HealthConnectPermissionStatus>(HEALTH_CONNECT_COMMANDS.requestPermissions)
}

export async function healthConnectSyncRecords(from?: string, to?: string): Promise<HealthConnectSyncResult> {
  return invokeHealthConnect<HealthConnectSyncResult>(HEALTH_CONNECT_COMMANDS.syncRecords, { from, to })
}
