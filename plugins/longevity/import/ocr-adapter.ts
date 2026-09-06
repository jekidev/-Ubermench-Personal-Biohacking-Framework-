import type { PdfTextBlock } from './pdf-lab-engine'

export type OcrPageResult = {
  page: number
  text: string
  confidence: number
  engine: string
  warnings: string[]
}

export interface OcrAdapter {
  id: string
  extract(bytes: Uint8Array): Promise<OcrPageResult[]>
}

export class UnavailableOcrAdapter implements OcrAdapter {
  id = 'unavailable'

  async extract(): Promise<OcrPageResult[]> {
    throw new Error('Local OCR is not configured. Enable Vision OCR or use a text-based PDF.')
  }
}

export function ocrPagesToBlocks(pages: OcrPageResult[]): PdfTextBlock[] {
  return pages.map((page) => ({
    page: page.page,
    text: page.text,
    confidence: page.confidence,
  }))
}

export const MIN_NATIVE_TEXT_CHARS = 80
export const MIN_NATIVE_CANDIDATES = 3

export function isNativeExtractionInsufficient(blocks: PdfTextBlock[], candidateCount: number): boolean {
  const textLength = blocks.reduce((sum, block) => sum + block.text.trim().length, 0)
  return textLength < MIN_NATIVE_TEXT_CHARS || candidateCount < MIN_NATIVE_CANDIDATES
}
