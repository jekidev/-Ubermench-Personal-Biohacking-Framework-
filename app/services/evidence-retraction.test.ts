import { describe, expect, it } from 'vitest'
import { evaluateRetraction, retractionFromCrossrefWork } from './evidence-retraction'

describe('evidence retraction', () => {
  it('never marks a record retracted without evidence', () => {
    expect(evaluateRetraction({ evidenceId: 'doi:10.1000/ok', doi: '10.1000/ok' }).status).toBe('not-retracted')
    expect(evaluateRetraction({ evidenceId: 'local-1' }).status).toBe('unknown')
  })

  it('honours explicit payload retraction flags', () => {
    const finding = evaluateRetraction({
      evidenceId: 'doi:10.1000/bad',
      doi: '10.1000/bad',
      retracted: true,
      retractionNotice: 'Retracted by the authors.',
    })
    expect(finding.status).toBe('retracted')
    expect(finding.source).toBe('record')
    expect(finding.notice).toContain('Retracted by the authors')
  })

  it('reads Crossref update-to retraction and concern types', () => {
    expect(retractionFromCrossrefWork('id-1', '10.1000/a', {
      message: { 'update-to': [{ type: 'retraction', DOI: '10.1000/notice' }] },
    }).status).toBe('retracted')
    expect(retractionFromCrossrefWork('id-2', '10.1000/b', {
      message: { 'update-to': [{ type: 'expression_of_concern' }] },
    }).status).toBe('expression-of-concern')
    expect(retractionFromCrossrefWork('id-3', '10.1000/c', { message: { 'update-to': [] } }).status).toBe('not-retracted')
  })
})
