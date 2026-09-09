import { chunkTranscriptText } from './chunker'
import { DocumentRagIndex } from './document-index'

export function indexTranscriptDocument(input: {
  documentId: string
  sha256: string
  title: string
  channel?: string
  url?: string
  language?: string
  plainText: string
  tags?: string[]
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}) {
  const chunks = chunkTranscriptText({
    documentId: input.documentId,
    sha256: input.sha256,
    filename: input.title,
    text: input.plainText,
    tags: input.tags ?? ['transcript', 'biohacking'],
    metadata: {
      channel: input.channel,
      url: input.url,
      language: input.language,
    },
  })

  if (!chunks.length) return { chunks: [], store: null }

  const store = new DocumentRagIndex(input.storage).indexChunks(chunks)
  return { chunks, store }
}
