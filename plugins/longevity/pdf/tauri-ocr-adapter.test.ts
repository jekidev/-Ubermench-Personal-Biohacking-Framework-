import { describe, expect, it } from 'vitest'
import { TauriOcrAdapter } from './tauri-ocr-adapter'

describe('tauri ocr adapter', () => {
  it('throws outside tauri runtime', async () => {
    const adapter = new TauriOcrAdapter()
    await expect(adapter.extract(new Uint8Array([1, 2, 3]))).rejects.toThrow(/Tauri desktop shell/)
  })
})
