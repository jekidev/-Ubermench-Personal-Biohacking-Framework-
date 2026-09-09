export interface SparklineGeometry {
  path: string
  width: number
  height: number
  min: number
  max: number
}

/**
 * Build a deterministic SVG polyline for compact longitudinal charts.
 * This is a visualisation helper only; it does not infer clinical meaning.
 */
export function sparklinePath(
  values: number[],
  width = 120,
  height = 32,
  padding = 2,
): SparklineGeometry {
  if (!Array.isArray(values)) throw new Error('Sparkline values must be an array')
  if (!Number.isFinite(width) || width <= 0) throw new Error('Sparkline width must be a positive number')
  if (!Number.isFinite(height) || height <= 0) throw new Error('Sparkline height must be a positive number')
  const finite = values.filter((value) => Number.isFinite(value))
  if (!finite.length) throw new Error('Sparkline values must include at least one finite number')

  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const span = max - min
  const innerWidth = Math.max(1, width - padding * 2)
  const innerHeight = Math.max(1, height - padding * 2)

  const points = finite.map((value, index) => {
    const x = padding + (finite.length === 1 ? innerWidth / 2 : (index / (finite.length - 1)) * innerWidth)
    const y = span === 0
      ? padding + innerHeight / 2
      : padding + innerHeight - ((value - min) / span) * innerHeight
    return `${round(x)},${round(y)}`
  })

  return {
    path: `M ${points.join(' L ')}`,
    width,
    height,
    min,
    max,
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
