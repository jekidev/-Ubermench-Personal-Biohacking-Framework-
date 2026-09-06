export type PdfDocumentKind = 'text' | 'scanned' | 'mixed' | 'empty'

export type PdfInspection = {
  kind: PdfDocumentKind
  textStreamCount: number
  imageXObjectCount: number
  recommendOcr: boolean
}

function countMatches(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0
}

export function inspectPdfBytes(bytes: Uint8Array): PdfInspection {
  if (!(bytes instanceof Uint8Array)) throw new Error('PDF bytes must be a Uint8Array')
  if (bytes.byteLength === 0) {
    return { kind: 'empty', textStreamCount: 0, imageXObjectCount: 0, recommendOcr: true }
  }

  const header = new TextDecoder('latin1').decode(bytes.slice(0, 8))
  if (!header.startsWith('%PDF')) {
    return { kind: 'empty', textStreamCount: 0, imageXObjectCount: 0, recommendOcr: true }
  }

  const raw = new TextDecoder('latin1').decode(bytes)
  const textStreamCount = countMatches(raw, /BT[\s\S]*?ET/g) + countMatches(raw, /\((?:\\.|[^\\)]){3,}\)/g)
  const imageXObjectCount = countMatches(raw, /\/Subtype\s*\/Image/g) + countMatches(raw, /\/XObject/g)

  if (textStreamCount === 0 && imageXObjectCount === 0) {
    return { kind: 'empty', textStreamCount, imageXObjectCount, recommendOcr: true }
  }
  if (textStreamCount === 0 && imageXObjectCount > 0) {
    return { kind: 'scanned', textStreamCount, imageXObjectCount, recommendOcr: true }
  }
  if (textStreamCount > 0 && imageXObjectCount > 3) {
    return { kind: 'mixed', textStreamCount, imageXObjectCount, recommendOcr: true }
  }
  return { kind: 'text', textStreamCount, imageXObjectCount, recommendOcr: false }
}
