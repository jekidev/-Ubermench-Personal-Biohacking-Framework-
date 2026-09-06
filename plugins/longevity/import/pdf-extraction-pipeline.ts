import { BrowserPdfTextExtractor, extractLabCandidates } from './pdf-adapter'
import type { PdfLabCandidate, PdfTextBlock } from './pdf-lab-engine'
import {
  isNativeExtractionInsufficient,
  type OcrAdapter,
  ocrPagesToBlocks,
} from './ocr-adapter'
import { extractPdfTextWithVision, type VisionDocumentRunner } from './vision-lab-extractor'
import { parsePdfLabBlocks } from './pdf-lab-engine'
import { inspectPdfBytes } from '../pdf/pdf-inspector'

export type PdfExtractionMethod = 'native-text' | 'ocr' | 'vision'

export type PdfExtractionPipelineOptions = {
  useOcr?: boolean
  useVision?: boolean
  ocrAdapter?: OcrAdapter
  visionRunner?: VisionDocumentRunner
}

export type PdfExtractionPipelineResult = {
  blocks: PdfTextBlock[]
  candidates: PdfLabCandidate[]
  method: PdfExtractionMethod
  requiresReview: boolean
  warnings: string[]
}

export async function runPdfExtractionPipeline(
  bytes: Uint8Array,
  options?: PdfExtractionPipelineOptions,
): Promise<PdfExtractionPipelineResult> {
  const extractor = new BrowserPdfTextExtractor()
  const warnings: string[] = []
  let blocks: PdfTextBlock[] = []
  let method: PdfExtractionMethod = 'native-text'
  const inspection = inspectPdfBytes(bytes)
  if (inspection.recommendOcr) {
    warnings.push(`PDF inspector classified this file as ${inspection.kind}; prefer local OCR for scanned lab reports.`)
  }

  try {
    blocks = await extractor.extract(bytes)
  } catch {
    blocks = []
  }

  let candidates = blocks.length ? parsePdfLabBlocks(blocks) : []
  const nativeResult = await extractLabCandidates(extractor, bytes).catch(() => ({
    candidates: [],
    pages: [],
    requiresReview: true,
  }))
  candidates = nativeResult.candidates

  if (!isNativeExtractionInsufficient(blocks, candidates.length)) {
    return {
      blocks,
      candidates,
      method: 'native-text',
      requiresReview: nativeResult.requiresReview,
      warnings,
    }
  }

  if (options?.useOcr && options.ocrAdapter) {
    try {
      const ocrPages = await options.ocrAdapter.extract(bytes)
      const ocrBlocks = ocrPagesToBlocks(ocrPages)
      if (ocrBlocks.some((block) => block.text.trim())) {
        blocks = ocrBlocks
        candidates = parsePdfLabBlocks(blocks)
        method = 'ocr'
        warnings.push('Local OCR used — confirm all biomarkers before saving.')
        for (const page of ocrPages) warnings.push(...page.warnings)
        return {
          blocks,
          candidates,
          method,
          requiresReview: true,
          warnings,
        }
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Local OCR failed')
    }
  }

  if (options?.useVision && options.visionRunner) {
    const vision = await extractPdfTextWithVision(bytes, options.visionRunner)
    if (vision.blocks.some((block) => block.text.trim())) {
      blocks = vision.blocks
      candidates = parsePdfLabBlocks(blocks)
      method = 'vision'
      warnings.push(...vision.warnings)
      return {
        blocks,
        candidates,
        method,
        requiresReview: true,
        warnings,
      }
    }
    warnings.push(...vision.warnings)
  }

  return {
    blocks,
    candidates,
    method,
    requiresReview: true,
    warnings: blocks.length
      ? warnings
      : [...warnings, 'No extractable text found. Enable OCR or Vision for scanned PDFs.'],
  }
}
