export interface UncertaintyResult {
  value: number
  standardError?: number
  lower?: number
  upper?: number
  confidence: number
  dataQuality: number
  evidenceStrength: number
  uncertainty: number
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)) }

export function summarizeUncertainty(values: number[], confidenceLevel = 0.95, dataQuality = 1, evidenceStrength = 0.5): UncertaintyResult {
  const clean = values.filter(Number.isFinite)
  if (!clean.length) return { value: 0, confidence: 0, dataQuality: 0, evidenceStrength, uncertainty: 1 }
  const value = clean.reduce((a, b) => a + b, 0) / clean.length
  if (clean.length < 2) return { value, confidence: clamp(0.35 * dataQuality + 0.35 * evidenceStrength), dataQuality, evidenceStrength, uncertainty: 1 }
  const variance = clean.reduce((sum, x) => sum + (x - value) ** 2, 0) / (clean.length - 1)
  const se = Math.sqrt(variance / clean.length)
  const z = confidenceLevel >= 0.99 ? 2.576 : confidenceLevel >= 0.95 ? 1.96 : 1.645
  const margin = z * se
  const confidence = clamp((Math.min(1, clean.length / 20) * 0.3) + dataQuality * 0.35 + evidenceStrength * 0.35)
  const uncertainty = clamp((margin / (Math.abs(value) + 1e-9)) * 0.5 + (1 - dataQuality) * 0.25 + (1 - evidenceStrength) * 0.25)
  return { value, standardError: se, lower: value - margin, upper: value + margin, confidence, dataQuality, evidenceStrength, uncertainty }
}

export function combineConfidence(...parts: number[]): number {
  const clean = parts.filter(Number.isFinite).map(clamp)
  if (!clean.length) return 0
  return clean.reduce((a, b) => a + b, 0) / clean.length
}
