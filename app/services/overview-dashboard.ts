import type { PersonalBiologyProfile } from '~/types/biology'
import type { DataGap, DataQualityReport } from '~/types/data-quality'
import { assessDataQuality, identifyDataGaps } from './data-quality-engine'
import type { BackupStatus } from './backup-status'
import { describeBackupStatus } from './backup-status'
import { safetyHighlight } from './profile-safety'
import type { SafetyFlag, SafetySeverity } from './safety-engine'

export interface OverviewExperiment {
  id: string
  intervention: string
  metric?: string
  startAt?: string
  runtime?: { status?: string }
}

export interface OverviewExperimentConclusion {
  conclusionType?: string
  conclusionRationale?: string
}

export interface OverviewNavigationCard {
  label: string
  to: string
  description: string
}

export interface OverviewSummary {
  quality: DataQualityReport
  qualityPercent: number
  gaps: DataGap[]
  topGap?: DataGap
  experimentCount: number
  latestConclusion?: {
    id: string
    intervention: string
    metric?: string
    status?: string
    conclusionType?: string
    conclusionRationale?: string
  }
  safetySeverity: SafetySeverity
  safetyReviewCount: number
  safetyTitle: string
  backupNote: string
  lastBackupAt?: string
  navigation: OverviewNavigationCard[]
}

export const OVERVIEW_NAVIGATION: OverviewNavigationCard[] = [
  { label: 'Biology', to: '/biology', description: 'Profile, backup and biomarker trends' },
  { label: 'Experiments', to: '/experiments', description: 'N-of-1 protocols and conclusions' },
  { label: 'Data health', to: '/data-health', description: 'Coverage, gaps and diagnostics' },
  { label: 'Health Sync', to: '/health-sync', description: 'Garmin and Health Connect adapters' },
  { label: 'Bloods', to: '/longevity/bloods', description: 'Laboratory results and review' },
  { label: 'Evidence', to: '/longevity/evidence', description: 'Normalized research records' },
  { label: 'Safety', to: '/safety', description: 'Interaction and dose screening' },
  { label: 'Agent', to: '/agent', description: 'Local agent runtime' },
]

export function latestExperiment<T extends OverviewExperiment>(
  experiments: T[],
): T | undefined {
  return [...experiments].sort((left, right) => {
    const leftTime = Date.parse(left.startAt ?? '')
    const rightTime = Date.parse(right.startAt ?? '')
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime)
  })[0]
}

export function buildOverviewSummary(input: {
  profile: PersonalBiologyProfile
  experiments?: OverviewExperiment[]
  summarizeExperiment?: (experiment: OverviewExperiment) => OverviewExperimentConclusion
  safetyFlags?: SafetyFlag[]
  backup?: BackupStatus | null
}): OverviewSummary {
  const quality = assessDataQuality(input.profile)
  const gaps = identifyDataGaps(input.profile)
  const experiments = input.experiments ?? []
  const latest = latestExperiment(experiments)
  const conclusion = latest && input.summarizeExperiment ? input.summarizeExperiment(latest) : undefined
  const safety = safetyHighlight(input.safetyFlags ?? [])

  return {
    quality,
    qualityPercent: Math.round(quality.completeness * 100),
    gaps,
    topGap: gaps[0],
    experimentCount: experiments.length,
    latestConclusion: latest
      ? {
          id: latest.id,
          intervention: latest.intervention,
          metric: latest.metric,
          status: latest.runtime?.status,
          conclusionType: conclusion?.conclusionType,
          conclusionRationale: conclusion?.conclusionRationale,
        }
      : undefined,
    safetySeverity: safety.severity,
    safetyReviewCount: safety.reviewCount,
    safetyTitle: safety.title,
    backupNote: describeBackupStatus(input.backup ?? null),
    lastBackupAt: input.backup?.lastExportedAt,
    navigation: OVERVIEW_NAVIGATION,
  }
}
