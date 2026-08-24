export type PdfTextSpan = {
  page: number
  text: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export type PdfExtractionResult = {
  sourcePathToken: string
  pages: Array<{
    page: number
    text: string
    spans?: PdfTextSpan[]
  }>
  method: 'native-text' | 'ocr'
  warnings: string[]
}

export interface NativePdfExtractor {
  extract(sourcePathToken: string): Promise<PdfExtractionResult>
}

/**
 * Platform-neutral bridge. The Tauri shell implements the command.
 * No PDF text is invented in the renderer.
 */
export class TauriPdfExtractor implements NativePdfExtractor {
  async extract(sourcePathToken: string): Promise<PdfExtractionResult> {
    if (!import.meta.client) throw new Error('PDF extraction is only available in the app runtime')
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<PdfExtractionResult>('extract_pdf_lab_text', { sourcePathToken })
  }
}

export class MissingPdfExtractor implements NativePdfExtractor {
  async extract(): Promise<PdfExtractionResult> {
    return {
      sourcePathToken: '',
      pages: [],
      method: 'native-text',
      warnings: ['No native PDF extractor is configured. Manual review is required.'],
    }
  }
}
