import type { PersonalBiologyProfile } from '~/types/biology'
import type { CausalEstimate } from './causal-engine'

export interface CalibrationAdjustment {
  target: string
  observedDelta: number
  confidence: number
  updatedAt: string
}

export interface CalibratedModel {
  adjustments: CalibrationAdjustment[]
  version: number
}

export function calibrateDigitalTwin(
  _profile: PersonalBiologyProfile,
  estimates: CausalEstimate[],
  previous?: CalibratedModel,
): CalibratedModel {
  const adjustments = estimates
    .filter((estimate): estimate is CausalEstimate & { delta: number } => Number.isFinite(estimate.delta) && estimate.confidence >= 0.5)
    .map((estimate) => ({
      target: estimate.metric,
      observedDelta: estimate.delta,
      confidence: Math.max(0, Math.min(1, estimate.confidence)),
      updatedAt: new Date().toISOString(),
    }))
  return {
    adjustments: [...(previous?.adjustments ?? []), ...adjustments].slice(-100),
    version: (previous?.version ?? 0) + 1,
  }
}
