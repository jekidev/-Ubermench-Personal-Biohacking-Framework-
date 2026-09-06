export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function isAndroidUserAgent(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

export async function isTauriAndroid(): Promise<boolean> {
  if (!isTauriRuntime()) return false
  try {
    const { type } = await import('@tauri-apps/plugin-os')
    const osType = await type()
    return osType === 'android'
  } catch {
    return isAndroidUserAgent()
  }
}

export function isAndroidBrowser(): boolean {
  return isAndroidUserAgent() && !isTauriRuntime()
}

export function healthConnectRequiresNativeApp(): boolean {
  return isAndroidBrowser()
}
