import { extractPdfTextBlocks } from '../pdf/text-extractor'
import { parsePdfLabBlocks, type PdfLabCandidate, type PdfTextBlock } from './pdf-lab-engine'

export interface PdfTextExtractor {
  extract(bytes: Uint8Array): Promise<PdfTextBlock[]>
}

export class UnconfiguredPdfTextExtractor implements PdfTextExtractor {
  async extract(): Promise<PdfTextBlock[]> {
    throw new Error('PDF text/OCR extractor is not configured in this runtime')
  }
}

export class BrowserPdfTextExtractor implements PdfTextExtractor {
  async extract(bytes: Uint8Array): Promise<PdfTextBlock[]> {
    const blocks = extractPdfTextBlocks(bytes)
    if (!blocks.length) throw new Error('No extractable text found in PDF. OCR review may be required.')
    return blocks
  }
}

export async function extractLabCandidates(
  extractor: PdfTextExtractor,
  bytes: Uint8Array,
): Promise<{ candidates: PdfLabCandidate[]; pages: number[]; requiresReview: boolean }> {
  const blocks = await extractor.extract(bytes)
  const candidates = parsePdfLabBlocks(blocks)
  return {
    candidates,
    pages: [...new Set(candidates.map((item) => item.page))].sort((a, b) => a - b),
    requiresReview: candidates.some((item) => item.confidence < 0.9 || item.warnings.length > 0),
  }
}
