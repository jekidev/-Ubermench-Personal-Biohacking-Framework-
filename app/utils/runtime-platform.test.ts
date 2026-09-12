import { describe, expect, it } from 'vitest'
import {
  detectProductRuntime,
  isAndroidBrowser,
  isAndroidProduct,
  nativeMcpCanRunHere,
} from './runtime-platform'

describe('runtime platform', () => {
  it('treats the current test/browser environment as non-Android without Tauri', () => {
    expect(detectProductRuntime()).toBe('browser')
    expect(isAndroidBrowser()).toBe(false)
    expect(isAndroidProduct()).toBe(false)
    expect(nativeMcpCanRunHere()).toBe(false)
  })

  it('only allows native MCP on desktop Tauri', () => {
    expect(nativeMcpCanRunHere('tauri-desktop')).toBe(true)
    expect(nativeMcpCanRunHere('tauri-android')).toBe(false)
    expect(nativeMcpCanRunHere('android-browser')).toBe(false)
    expect(nativeMcpCanRunHere('browser')).toBe(false)
    expect(isAndroidProduct('android-browser')).toBe(true)
    expect(isAndroidProduct('tauri-android')).toBe(true)
    expect(isAndroidProduct('tauri-desktop')).toBe(false)
  })
})
