import type { OcrAdapter, OcrPageResult } from '../import/ocr-adapter'

type TauriOcrExtractionResult = {
  pages: Array<{
    page: number
    text: string
    confidence: number
    engine: string
    warnings: string[]
  }>
  engine: string
  warnings: string[]
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export class TauriOcrAdapter implements OcrAdapter {
  id = 'tesseract-tauri'

  async extract(bytes: Uint8Array): Promise<OcrPageResult[]> {
    if (!isTauriRuntime()) {
      throw new Error('Tesseract OCR is only available in the Tauri desktop shell.')
    }
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<TauriOcrExtractionResult>('ocr_pdf_bytes', { pdfBytes: Array.from(bytes) })
    return result.pages.map((page) => ({
      page: page.page,
      text: page.text,
      confidence: page.confidence,
      engine: page.engine,
      warnings: page.warnings,
    }))
  }
}

export async function isTauriOcrAvailable(): Promise<boolean> {
  if (!isTauriRuntime()) return false
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<boolean>('ocr_runtime_status')
  } catch {
    return false
  }
}
