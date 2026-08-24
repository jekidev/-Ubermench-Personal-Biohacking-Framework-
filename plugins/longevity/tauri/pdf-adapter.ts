export type PdfExtractionPage = {
  page_number: number
  text: string
}

export type PdfExtractionResult = {
  method: 'native-text' | 'ocr'
  pages: PdfExtractionPage[]
  warnings: string[]
}

/**
 * Calls the native Tauri extractor when running inside the desktop shell.
 * The browser fallback deliberately returns a fail-closed result.
 */
export async function extractPdfLabText(data: Uint8Array): Promise<PdfExtractionResult> {
  if (!import.meta.client) {
    return { method: 'native-text', pages: [], warnings: ['PDF extraction is only available in the desktop runtime'] }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<PdfExtractionResult>('extract_pdf_lab_text', { data: Array.from(data) })
  } catch (error) {
    return {
      method: 'native-text',
      pages: [],
      warnings: [error instanceof Error ? error.message : 'Native PDF extraction unavailable'],
    }
  }
}
