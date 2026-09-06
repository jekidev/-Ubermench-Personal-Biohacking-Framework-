import type { PdfLabCandidate } from './pdf-lab-engine'

export type LlmLabExtractionResult = {
  candidates: PdfLabCandidate[]
  requiresReview: true
  method: 'llm-assisted'
  warnings: string[]
}

const SYSTEM_PROMPT = `You extract laboratory biomarkers from Danish or English blood test text.
Return ONLY valid JSON: an array of objects with keys biomarker, value, unit, collectedAt (ISO date if known), referenceLow, referenceHigh.
Do not invent values. If uncertain, omit the marker.
This is decision-support only — values require human review before clinical use.`

export function buildLlmLabExtractionPrompt(pageText: string): string {
  return `Extract biomarkers from this laboratory report text:\n\n${pageText.slice(0, 12000)}`
}

export function parseLlmLabExtractionResponse(raw: string, page = 1): PdfLabCandidate[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>
    return parsed.flatMap((item, index) => {
      const biomarker = String(item.biomarker ?? item.marker ?? item.name ?? '').trim()
      const value = Number(item.value ?? item.result)
      if (!biomarker || !Number.isFinite(value)) return []
      return [{
        biomarker,
        value,
        unit: String(item.unit ?? 'unknown'),
        referenceLow: typeof item.referenceLow === 'number' ? item.referenceLow : undefined,
        referenceHigh: typeof item.referenceHigh === 'number' ? item.referenceHigh : undefined,
        collectedAt: typeof item.collectedAt === 'string' ? item.collectedAt : undefined,
        page,
        locator: `llm:page-${page}:${index + 1}`,
        confidence: 0.65,
        warnings: ['LLM-assisted extraction — confirm before saving.'],
      }]
    })
  } catch {
    return []
  }
}

export async function extractLabCandidatesWithLlm(
  pageTexts: string[],
  runLlm: (prompt: string, system: string) => Promise<string>,
): Promise<LlmLabExtractionResult> {
  const candidates: PdfLabCandidate[] = []
  const warnings = ['LLM-assisted extraction used as fallback. All values require explicit review.']

  for (let index = 0; index < pageTexts.length; index += 1) {
    const text = pageTexts[index]
    if (!text?.trim()) continue
    const response = await runLlm(buildLlmLabExtractionPrompt(text), SYSTEM_PROMPT)
    candidates.push(...parseLlmLabExtractionResponse(response, index + 1))
  }

  return {
    candidates,
    requiresReview: true,
    method: 'llm-assisted',
    warnings,
  }
}
