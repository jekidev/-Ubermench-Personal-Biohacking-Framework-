import type { PdfTextBlock } from '../import/pdf-lab-engine'

/**
 * Extracts printable text streams from simple PDF byte payloads.
 * Works for text-based exports such as sundhed.dk laboratory PDFs.
 */
export function extractPdfTextBlocks(bytes: Uint8Array): PdfTextBlock[] {
  const raw = new TextDecoder('latin1').decode(bytes)
  const streams: string[] = []
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let match = streamPattern.exec(raw)
  while (match) {
    const streamBody = match[1]
    if (!streamBody) {
      match = streamPattern.exec(raw)
      continue
    }
    const chunk = streamBody
      .replace(/\(([^()\\]*)\)/g, '$1')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    if (chunk.trim()) streams.push(chunk)
    match = streamPattern.exec(raw)
  }

  const text = streams.join('\n').replace(/[^\S\r\n\x20-\x7E\xC0-\xFF]/g, ' ').replace(/[ \t]+\n/g, '\n')
  if (!text.trim()) return []

  const pages = text.split(/\f+/).filter((page) => page.trim())
  if (pages.length > 1) {
    return pages.map((page, index) => ({ page: index + 1, text: page, confidence: 0.8 }))
  }

  return [{ page: 1, text, confidence: 0.8 }]
}
