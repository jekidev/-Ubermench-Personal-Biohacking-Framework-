import type { PersonalBiologyProfile } from '~/types/biology'
import type { DataGap, DataQualityReport } from '~/types/data-quality'

export function assessDataQuality(profile: PersonalBiologyProfile): DataQualityReport {
  const totalCollections = 7
  const populatedCollections = [profile.biomarkers, profile.variants, profile.medications, profile.supplements, profile.symptoms, profile.sleep, profile.training].filter((items) => items.length > 0).length
  const completeness = populatedCollections / totalCollections
  const timestampCoverage = profile.biomarkers.length ? profile.biomarkers.filter((item) => Boolean(item.measuredAt && !Number.isNaN(Date.parse(item.measuredAt)))).length / profile.biomarkers.length : 0
  const unitCoverage = profile.biomarkers.length ? profile.biomarkers.filter((item) => Boolean(item.unit.trim())).length / profile.biomarkers.length : 0
  const sourcedCollections = [profile.biomarkers, profile.sleep, profile.training].flat().filter((item) => 'source' in item && Boolean(item.source)).length
  const sourceCoverage = profile.biomarkers.length + profile.sleep.length + profile.training.length ? sourcedCollections / (profile.biomarkers.length + profile.sleep.length + profile.training.length) : 0
  const issues: string[] = []
  if (!profile.goals.length) issues.push('No explicit goals are configured.')
  if (completeness < 0.5) issues.push('Less than half of the core biological domains contain data.')
  if (timestampCoverage < 1 && profile.biomarkers.length) issues.push('Some biomarker records have missing or invalid timestamps.')
  if (unitCoverage < 1 && profile.biomarkers.length) issues.push('Some biomarker records have missing units.')

  return { completeness, sourceCoverage, timestampCoverage, unitCoverage, issues }
}

export function identifyDataGaps(profile: PersonalBiologyProfile): DataGap[] {
  const gaps: DataGap[] = []
  if (!profile.biomarkers.length) gaps.push({ metric: 'core biomarkers', reason: 'No longitudinal laboratory data exists.', expectedDecisionImpact: 0.95 })
  if (!profile.sleep.length) gaps.push({ metric: 'sleep', reason: 'No sleep/recovery time series is available.', expectedDecisionImpact: 0.8 })
  if (!profile.training.length) gaps.push({ metric: 'training load', reason: 'No training exposure is available for confounder control.', expectedDecisionImpact: 0.65 })
  if (!profile.variants.length) gaps.push({ metric: 'genetic context', reason: 'No genomic context is available for genotype-sensitive decisions.', expectedDecisionImpact: 0.35 })
  if (!profile.goals.length) gaps.push({ metric: 'objective weights', reason: 'No explicit optimization target is configured.', expectedDecisionImpact: 0.9 })
  return gaps.sort((a, b) => b.expectedDecisionImpact - a.expectedDecisionImpact)
}
