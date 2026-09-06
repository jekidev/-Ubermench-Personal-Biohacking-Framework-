import type { PersonalBiologyProfile } from '~/types/biology'
import { emptyBiologyProfile } from './biology-store'

export const SUPPORTED_BIOLOGY_PROFILE_VERSIONS = [1] as const
export type BiologyProfileVersion = (typeof SUPPORTED_BIOLOGY_PROFILE_VERSIONS)[number]

export function migrateBiologyProfile(raw: unknown): PersonalBiologyProfile {
  if (!isRecord(raw)) return emptyBiologyProfile()

  const version = raw.version
  if (version === 1) return normalizeV1Profile(raw)

  throw new Error(`Unsupported biology profile version: ${String(version)}`)
}

function normalizeV1Profile(raw: Record<string, unknown>): PersonalBiologyProfile {
  const base = emptyBiologyProfile()
  return {
    version: 1,
    biomarkers: Array.isArray(raw.biomarkers) ? raw.biomarkers as PersonalBiologyProfile['biomarkers'] : [],
    variants: Array.isArray(raw.variants) ? raw.variants as PersonalBiologyProfile['variants'] : [],
    medications: Array.isArray(raw.medications) ? raw.medications as PersonalBiologyProfile['medications'] : [],
    supplements: Array.isArray(raw.supplements) ? raw.supplements as PersonalBiologyProfile['supplements'] : [],
    symptoms: Array.isArray(raw.symptoms) ? raw.symptoms as PersonalBiologyProfile['symptoms'] : [],
    sleep: Array.isArray(raw.sleep) ? raw.sleep as PersonalBiologyProfile['sleep'] : [],
    training: Array.isArray(raw.training) ? raw.training as PersonalBiologyProfile['training'] : [],
    goals: Array.isArray(raw.goals) ? raw.goals.filter((goal): goal is string => typeof goal === 'string') : [],
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
