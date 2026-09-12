import {
  detectProductRuntime,
  type ProductRuntime,
} from '~/utils/runtime-platform'

export const ANDROID_RESEARCH_HREF = '/settings?tab=research'
export const ANDROID_MEMORY_HREF = '/settings?tab=memory'
export const ANDROID_PLUGINS_HREF = '/settings?tab=plugins'
export const ANDROID_BLOODS_HREF = '/longevity/bloods'
export const ANDROID_DRIVE_HREF = '/connectors'
export const ANDROID_HEALTH_SYNC_HREF = '/health-sync'
export const ANDROID_TAURI_APP_HINT = 'native Android app (not Chrome/PWA)'

export const NATIVE_MCP_ANDROID_MESSAGE =
  'Native MCP (paper-search, LDR, Transcriptor, SuperMemory, Mem0) cannot run on this Android phone — uvx and Docker sidecars are not available in Chrome/PWA. Use research.europepmc, research.paperqa.ask (after indexing a lab PDF), plugins.garmin.status, or plugins.pdf.inspect instead. Do not mint a preflight token here.'

export const NATIVE_MCP_DESKTOP_MESSAGE =
  'Native MCP (paper-search, LDR, Transcriptor, SuperMemory, Mem0) only runs in the Tauri desktop app with an Agent preflight token. Chat and Overview cannot run uvx or Docker, and cannot mint that token.'

export const MCP_SIDECAR_ANDROID_MESSAGE =
  'uvx/Docker sidecars do not run on Android Chrome. Use research.europepmc and PaperQA on this phone, or index a lab PDF via Bloods / Drive. Check sidecar is only for a desktop Tauri install and never auto-starts uvx.'

export const MCP_SIDECAR_BROWSER_DESKTOP_MESSAGE =
  'Sidecars are not started from the browser. On a desktop Tauri install, use Check sidecar. On Android, use research.europepmc, PaperQA, Bloods, or Drive instead. uvx and Docker are never auto-started.'

export const HEALTH_CONNECT_BROWSER_MESSAGE =
  'Health Connect cannot run in Chrome or a PWA. Import Garmin JSON on Health Sync instead. Health Connect only exists in the native Android app later — not in this browser, and not via an npm/laptop command.'

export type AndroidFallbackLink = {
  label: string
  href: string
  tool?: string
}

function androidRuntime(runtime: ProductRuntime): boolean {
  return runtime === 'android-browser' || runtime === 'tauri-android'
}

export function androidWorkingFallbacks(): AndroidFallbackLink[] {
  return [
    { label: 'Europe PMC on this phone', href: ANDROID_RESEARCH_HREF, tool: 'research.europepmc' },
    { label: 'PaperQA over indexed PDFs', href: ANDROID_RESEARCH_HREF, tool: 'research.paperqa.ask' },
    { label: 'Index a lab PDF on Bloods', href: ANDROID_BLOODS_HREF },
    { label: 'Connect Drive for lab PDFs', href: ANDROID_DRIVE_HREF },
    { label: 'Garmin JSON or vault token', href: ANDROID_HEALTH_SYNC_HREF, tool: 'plugins.garmin.status' },
  ]
}

export function nativeMcpUnavailableMessage(runtime: ProductRuntime = detectProductRuntime()): string {
  return androidRuntime(runtime) ? NATIVE_MCP_ANDROID_MESSAGE : NATIVE_MCP_DESKTOP_MESSAGE
}

export function mcpSidecarUnavailableMessage(runtime: ProductRuntime = detectProductRuntime()): string {
  return androidRuntime(runtime) ? MCP_SIDECAR_ANDROID_MESSAGE : MCP_SIDECAR_BROWSER_DESKTOP_MESSAGE
}

export function nativeMcpHandoffHref(runtime: ProductRuntime = detectProductRuntime()): string {
  return androidRuntime(runtime) ? ANDROID_RESEARCH_HREF : '/agent'
}

export function nativeMcpHandoffCta(runtime: ProductRuntime = detectProductRuntime()): string {
  return androidRuntime(runtime) ? 'Use Europe PMC / PaperQA' : 'Open Agent'
}

export function formatAndroidNativeHandoff(names: string, runtime: ProductRuntime = detectProductRuntime()): string {
  const pending = names.trim() ? ` Pending: ${names}.` : ''
  return `${nativeMcpUnavailableMessage(runtime)}${pending} On this phone use research.europepmc or PaperQA (Settings → Research), index a lab PDF on Bloods / Drive, or import Garmin JSON on Health Sync. Catalog tools can be approved here.`
}
