export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function isAndroidUserAgent(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

export async function isTauriAndroid(): Promise<boolean> {
  return isTauriRuntime() && isAndroidUserAgent()
}

export function isAndroidBrowser(): boolean {
  return isAndroidUserAgent() && !isTauriRuntime()
}

export function healthConnectRequiresNativeApp(): boolean {
  return isAndroidBrowser()
}
