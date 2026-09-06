import type { PdfTextBlock } from './pdf-lab-engine'

export type VisionDocumentRunner = (args: {
  pdfBase64: string
  system: string
  prompt: string
}) => Promise<string>

const VISION_SYSTEM = `You read scanned laboratory PDF documents.
Return ONLY valid JSON: { "pages": [{ "page": 1, "text": "full extracted text for page 1" }] }
Extract all visible biomarker names, values, units, dates, and reference ranges.
Do not invent values. Preserve Danish and English labels as written.`

const VISION_PROMPT = 'Extract all readable text from this laboratory PDF, grouped by page number.'

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function parseVisionExtractionResponse(raw: string): PdfTextBlock[] {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { pages?: Array<{ page?: number; text?: string }> }
    if (!Array.isArray(parsed.pages)) return []
    return parsed.pages.flatMap((page, index) => {
      const text = String(page.text ?? '').trim()
      if (!text) return []
      return [{
        page: typeof page.page === 'number' ? page.page : index + 1,
        text,
        confidence: 0.55,
      }]
    })
  } catch {
    return []
  }
}

export async function extractPdfTextWithVision(
  bytes: Uint8Array,
  runVision: VisionDocumentRunner,
): Promise<{ blocks: PdfTextBlock[]; warnings: string[] }> {
  const response = await runVision({
    pdfBase64: bytesToBase64(bytes),
    system: VISION_SYSTEM,
    prompt: VISION_PROMPT,
  })
  const blocks = parseVisionExtractionResponse(response)
  return {
    blocks,
    warnings: blocks.length
      ? ['Vision OCR used — all extracted values require explicit review.']
      : ['Vision OCR returned no readable text.'],
  }
}
