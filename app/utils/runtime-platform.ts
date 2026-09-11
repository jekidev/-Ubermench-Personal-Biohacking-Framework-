export type ProductRuntime = 'android-browser' | 'tauri-android' | 'tauri-desktop' | 'browser'

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

export function detectProductRuntime(): ProductRuntime {
  if (isTauriRuntime()) {
    return isAndroidUserAgent() ? 'tauri-android' : 'tauri-desktop'
  }
  return isAndroidUserAgent() ? 'android-browser' : 'browser'
}

export function isAndroidProduct(runtime: ProductRuntime = detectProductRuntime()): boolean {
  return runtime === 'android-browser' || runtime === 'tauri-android'
}

/** uvx / Docker stdio MCP only exists on desktop Tauri. Android Chrome and Tauri Android do not run those sidecars. */
export function nativeMcpCanRunHere(runtime: ProductRuntime = detectProductRuntime()): boolean {
  return runtime === 'tauri-desktop'
}

export function healthConnectRequiresNativeApp(): boolean {
  return isAndroidBrowser()
}
