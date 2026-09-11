import { describe, expect, it } from 'vitest'
import {
  ANDROID_BLOODS_HREF,
  ANDROID_DRIVE_HREF,
  ANDROID_HEALTH_SYNC_HREF,
  ANDROID_RESEARCH_HREF,
  androidWorkingFallbacks,
  formatAndroidNativeHandoff,
  HEALTH_CONNECT_BROWSER_MESSAGE,
  mcpSidecarUnavailableMessage,
  nativeMcpHandoffCta,
  nativeMcpHandoffHref,
  nativeMcpUnavailableMessage,
  NATIVE_MCP_ANDROID_MESSAGE,
} from './android-fallbacks'

describe('android fallbacks', () => {
  it('points Android native MCP at Europe PMC / PaperQA instead of uvx', () => {
    expect(nativeMcpUnavailableMessage('android-browser')).toBe(NATIVE_MCP_ANDROID_MESSAGE)
    expect(nativeMcpUnavailableMessage('android-browser')).toMatch(/research\.europepmc/)
    expect(nativeMcpUnavailableMessage('android-browser')).not.toMatch(/buy a laptop|Open the Tauri desktop app/i)
    expect(nativeMcpHandoffHref('android-browser')).toBe(ANDROID_RESEARCH_HREF)
    expect(nativeMcpHandoffCta('android-browser')).toMatch(/Europe PMC/)
    expect(formatAndroidNativeHandoff('mcp.stdio:paper-search', 'android-browser')).toContain('mcp.stdio:paper-search')
    expect(formatAndroidNativeHandoff('mcp.stdio:paper-search', 'android-browser')).toContain('Bloods')
  })

  it('keeps a desktop sidecar explanation off Android', () => {
    expect(nativeMcpUnavailableMessage('browser')).toMatch(/Tauri desktop app/)
    expect(nativeMcpHandoffHref('browser')).toBe('/agent')
    expect(mcpSidecarUnavailableMessage('android-browser')).toMatch(/do not run on Android/)
    expect(HEALTH_CONNECT_BROWSER_MESSAGE).toMatch(/cannot run in Chrome/)
    expect(HEALTH_CONNECT_BROWSER_MESSAGE).toMatch(/tauri:android/)
  })

  it('lists Android-working next steps', () => {
    const hrefs = androidWorkingFallbacks().map((item) => item.href)
    expect(hrefs).toEqual(expect.arrayContaining([
      ANDROID_RESEARCH_HREF,
      ANDROID_BLOODS_HREF,
      ANDROID_DRIVE_HREF,
      ANDROID_HEALTH_SYNC_HREF,
    ]))
  })
})
