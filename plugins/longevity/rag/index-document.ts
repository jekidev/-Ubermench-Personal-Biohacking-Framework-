import { extractPdfTextBlocks } from '../pdf/text-extractor'
import { chunkDocumentPages } from './chunker'
import { DocumentRagIndex } from './document-index'

export function indexUploadedDocument(input: {
  documentId: string
  sha256: string
  filename: string
  bytes?: Uint8Array
  pageTexts?: Array<{ page: number; text: string; confidence?: number }>
  extractionMethod?: 'native-text' | 'llm-assisted'
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}) {
  const pages = input.pageTexts ?? (input.bytes ? extractPdfTextBlocks(input.bytes).map((block) => ({
    page: block.page,
    text: block.text,
    confidence: block.confidence,
  })) : [])

  if (!pages.length) return { chunks: [], store: null }

  const chunks = chunkDocumentPages({
    documentId: input.documentId,
    sha256: input.sha256,
    filename: input.filename,
    pages,
    extractionMethod: input.extractionMethod,
  })

  const store = new DocumentRagIndex(input.storage).indexChunks(chunks)
  return { chunks, store }
}
