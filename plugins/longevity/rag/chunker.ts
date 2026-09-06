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

export function chunkDocumentPages(input: {
  documentId: string
  sha256: string
  filename: string
  pages: DocumentPageText[]
  extractionMethod?: DocumentChunk['extractionMethod']
}): DocumentChunk[] {
  const method = input.extractionMethod ?? 'native-text'
  const chunks: DocumentChunk[] = []
  let chunkIndex = 0

  for (const page of input.pages) {
    const paragraphs = page.text
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
          page: page.page,
          content: buffer.trim(),
          tags: ['lab-document', 'blood-report'],
          indexedAt: new Date().toISOString(),
          extractionMethod: method,
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
        page: page.page,
        content: buffer.trim(),
        tags: ['lab-document', 'blood-report'],
        indexedAt: new Date().toISOString(),
        extractionMethod: method,
      })
    }
  }

  return chunks
}
