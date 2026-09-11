import { describe, expect, it } from 'vitest'
import { answerPaperQaFromLocalRag, buildPaperQaPlan, paperQaCitationsToEvidenceNotes, validatePaperQaAnswer } from './paper-qa'

describe('paper-qa', () => {
  it('builds an approval-bound local plan without Sci-Hub', () => {
    const plan = buildPaperQaPlan('Does metformin change all-cause mortality?')
    expect(plan.requiresApproval).toBe(true)
    expect(plan.requiresLocalRuntime).toBe(true)
    expect(plan.sciHubEnabled).toBe(false)
  })

  it('rejects empty questions and maps citations to evidence notes', () => {
    expect(() => buildPaperQaPlan('   ')).toThrow('cannot be empty')
    const answer = validatePaperQaAnswer({
      question: 'metformin mortality',
      answer: 'Human outcome evidence is mixed.',
      backend: 'paper-qa',
      confidence: 0.7,
      citations: [{ key: '1', title: 'Metformin trial', doi: '10.1/xyz' }],
    })
    expect(paperQaCitationsToEvidenceNotes(answer)[0]).toContain('10.1/xyz')
  })

  it('returns a local-rag fallback when no documents are indexed', () => {
    const answer = answerPaperQaFromLocalRag('Does metformin change mortality?', {
      getItem: () => null,
      setItem: () => {},
    })
    expect(answer.backend).toBe('local-rag')
    expect(answer.answer).toContain('No indexed local PDF')
  })
})
