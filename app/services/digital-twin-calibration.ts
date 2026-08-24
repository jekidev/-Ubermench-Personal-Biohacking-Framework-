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
    .filter((estimate) => Number.isFinite(estimate.delta) && estimate.confidence !== 'low')
    .map((estimate) => ({
      target: estimate.metric,
      observedDelta: estimate.delta,
      confidence: estimate.confidence === 'high' ? 0.85 : 0.6,
      updatedAt: new Date().toISOString(),
    }))
  return {
    adjustments: [...(previous?.adjustments ?? []), ...adjustments].slice(-100),
    version: (previous?.version ?? 0) + 1,
  }
}
