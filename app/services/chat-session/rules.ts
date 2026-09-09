import type { ChatRule } from './types'

export const CHAT_RULES: ChatRule[] = [
  {
    id: 'safety-conservative',
    name: 'Conservative safety',
    description: 'Never recommend treatment changes without flagging contraindications and monitoring.',
    prompt: 'Apply conservative safety screening. Flag contraindications, drug interactions, and monitoring needs. Do not present supplements or protocols as medical advice.',
    enabled: true,
    category: 'safety',
  },
  {
    id: 'evidence-grade',
    name: 'Evidence grading',
    description: 'Separate mechanistic plausibility from human outcome evidence.',
    prompt: 'Grade claims by evidence quality. Distinguish in-vitro/animal data from human RCTs and N-of-1 personal data. State uncertainty explicitly.',
    enabled: true,
    category: 'evidence',
  },
  {
    id: 'privacy-local-first',
    name: 'Local-first privacy',
    description: 'Prefer local data and avoid suggesting cloud upload of raw DNA or health exports.',
    prompt: 'Keep recommendations local-first. Do not suggest uploading raw DNA, full lab exports, or identifiable health data to third parties unless the user explicitly opts in.',
    enabled: true,
    category: 'privacy',
  },
  {
    id: 'stack-synergy',
    name: 'Stack synergy lens',
    description: 'Explain how active skills, connectors, and workflows interact for the current question.',
    prompt: 'When relevant, explain synergies between supplements, protocols, biomarkers, and enabled tools. Call out conflicts, timing interactions, and what data would reduce uncertainty.',
    enabled: true,
    category: 'style',
  },
  {
    id: 'danish-friendly',
    name: 'Danish context',
    description: 'Answer in Danish when the user writes in Danish; keep medical terms precise.',
    prompt: 'Match the user language. If the user writes Danish, respond in Danish with precise medical terminology and plain-language summaries.',
    enabled: false,
    category: 'style',
  },
]

export function getChatRule(id: string): ChatRule | undefined {
  return CHAT_RULES.find((rule) => rule.id === id)
}
