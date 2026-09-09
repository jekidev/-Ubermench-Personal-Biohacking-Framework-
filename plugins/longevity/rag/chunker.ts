export type DocumentPageText = {
  page: number
  text: string
  confidence?: number
}

export type DocumentChunk = {
  id: string
  documentId: string
  sha256: string
  filename: string
  page?: number
  content: string
  tags: string[]
  indexedAt: string
  extractionMethod: 'native-text' | 'llm-assisted'
}

const MAX_CHUNK_CHARS = 1200

function chunkTextBlocks(input: {
  documentId: string
  sha256: string
  filename: string
  blocks: Array<{ page?: number; text: string }>
  tags: string[]
  extractionMethod: DocumentChunk['extractionMethod']
}): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  let chunkIndex = 0

  for (const block of input.blocks) {
    const paragraphs = block.text
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)

    let buffer = ''
    for (const paragraph of paragraphs) {
      if ((buffer + '\n\n' + paragraph).length > MAX_CHUNK_CHARS && buffer) {
        chunks.push({
          id: `${input.documentId}:chunk:${chunkIndex += 1}`,
          documentId: input.documentId,
          sha256: input.sha256,
          filename: input.filename,
          page: block.page,
          content: buffer.trim(),
          tags: input.tags,
          indexedAt: new Date().toISOString(),
          extractionMethod: input.extractionMethod,
        })
        buffer = paragraph
      } else {
        buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph
      }
    }

    if (buffer.trim()) {
      chunks.push({
        id: `${input.documentId}:chunk:${chunkIndex += 1}`,
        documentId: input.documentId,
        sha256: input.sha256,
        filename: input.filename,
        page: block.page,
        content: buffer.trim(),
        tags: input.tags,
        indexedAt: new Date().toISOString(),
        extractionMethod: input.extractionMethod,
      })
    }
  }

  return chunks
}

export function chunkDocumentPages(input: {
  documentId: string
  sha256: string
  filename: string
  pages: DocumentPageText[]
  extractionMethod?: DocumentChunk['extractionMethod']
  tags?: string[]
}): DocumentChunk[] {
  const method = input.extractionMethod ?? 'native-text'
  const tags = input.tags ?? ['lab-document', 'blood-report']
  return chunkTextBlocks({
    documentId: input.documentId,
    sha256: input.sha256,
    filename: input.filename,
    blocks: input.pages.map((page) => ({ page: page.page, text: page.text })),
    tags,
    extractionMethod: method,
  })
}

export function chunkTranscriptText(input: {
  documentId: string
  sha256: string
  filename: string
  text: string
  tags?: string[]
  metadata?: { channel?: string; url?: string; language?: string }
}): DocumentChunk[] {
  const prefix = [
    input.metadata?.channel ? `Channel: ${input.metadata.channel}` : '',
    input.metadata?.url ? `Source: ${input.metadata.url}` : '',
    input.metadata?.language ? `Language: ${input.metadata.language}` : '',
  ].filter(Boolean).join('\n')

  const text = prefix ? `${prefix}\n\n${input.text}` : input.text
  return chunkTextBlocks({
    documentId: input.documentId,
    sha256: input.sha256,
    filename: input.filename,
    blocks: [{ text }],
    tags: input.tags ?? ['transcript', 'biohacking'],
    extractionMethod: 'native-text',
  })
}
