import type { PersonalBiologyProfile } from '~/types/biology'

export interface BiologicalState { biomarkerCount: number; variantCount: number; activeMedicationCount: number; activeSupplementCount: number; symptomCount: number; sleepSamples: number; trainingSamples: number; goals: string[]; updatedAt: string }

export function deriveBiologicalState(profile: PersonalBiologyProfile): BiologicalState {
  return { biomarkerCount: profile.biomarkers.length, variantCount: profile.variants.length, activeMedicationCount: profile.medications.filter((x) => x.active).length, activeSupplementCount: profile.supplements.filter((x) => x.active).length, symptomCount: profile.symptoms.length, sleepSamples: profile.sleep.length, trainingSamples: profile.training.length, goals: [...profile.goals], updatedAt: profile.updatedAt }
}
