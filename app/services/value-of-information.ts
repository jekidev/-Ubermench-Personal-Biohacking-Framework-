import type { PersonalBiologyProfile } from '~/types/biology'
import type { ValueOfInformationItem } from '~/types/adaptive'

export function rankValueOfInformation(profile: PersonalBiologyProfile): ValueOfInformationItem[] {
  const items: ValueOfInformationItem[] = []
  if (!profile.biomarkers.length) items.push({ metric: 'core biomarkers', value: 0.98, rationale: 'Laboratory trends constrain many metabolic, cardiovascular and inflammation decisions.' })
  if (!profile.sleep.length) items.push({ metric: 'sleep/recovery series', value: 0.88, rationale: 'Sleep and recovery data reduce confounding in training and intervention decisions.' })
  if (!profile.training.length) items.push({ metric: 'training load', value: 0.72, rationale: 'Training exposure is an important confounder for recovery and performance outcomes.' })
  if (!profile.variants.length) items.push({ metric: 'genomic context', value: 0.34, rationale: 'Genomic data can refine genotype-sensitive interventions but is rarely decisive alone.' })
  if (!profile.goals.length) items.push({ metric: 'explicit objectives', value: 0.95, rationale: 'Without objective weights there is no reliable multi-objective optimization target.' })
  return items.sort((a, b) => b.value - a.value)
}
