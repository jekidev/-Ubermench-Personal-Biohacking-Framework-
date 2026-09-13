import type { DietProtocol, MedicationRecord, PersonalBiologyProfile, SupplementRecord } from '~/types/biology'
import { formatRestrictionList, hasDietProtocol } from './regimen-editor'

function formatAgentLine(item: SupplementRecord | MedicationRecord): string {
  const details = [item.dose, 'frequency' in item ? item.frequency : undefined, 'timing' in item ? item.timing : undefined]
    .filter((value): value is string => Boolean(value))
  const suffix = details.length ? ` (${details.join(', ')})` : ''
  const paused = item.active ? '' : ' [paused]'
  return `${item.name}${suffix}${paused}`
}

export function summarizeDietProtocol(diet?: DietProtocol): string {
  if (!hasDietProtocol(diet) || !diet) return ''
  const parts = [
    diet.pattern,
    diet.eatingWindow ? `window ${diet.eatingWindow}` : undefined,
    diet.proteinTargetGrams ? `${diet.proteinTargetGrams} g protein target` : undefined,
    diet.restrictions?.length ? `avoid ${formatRestrictionList(diet.restrictions)}` : undefined,
  ].filter((value): value is string => Boolean(value))
  const summary = parts.join(' · ')
  return diet.notes ? [summary, diet.notes].filter(Boolean).join('. ') : summary
}

export function formatPersonalRegimenContext(profile: PersonalBiologyProfile): string {
  const activeSupplements = profile.supplements.filter((item) => item.active)
  const pausedSupplements = profile.supplements.filter((item) => !item.active)
  const activeMeds = profile.medications.filter((item) => item.active)
  const pausedMeds = profile.medications.filter((item) => !item.active)
  const diet = summarizeDietProtocol(profile.diet)

  if (!activeSupplements.length && !pausedSupplements.length && !activeMeds.length && !pausedMeds.length && !diet) {
    return ''
  }

  const lines = ['Personal regimen (local profile, user-entered):']
  if (activeSupplements.length) lines.push(`Active stack: ${activeSupplements.map(formatAgentLine).join('; ')}`)
  if (pausedSupplements.length) lines.push(`Paused supplements: ${pausedSupplements.map(formatAgentLine).join('; ')}`)
  if (activeMeds.length) lines.push(`Active medications: ${activeMeds.map(formatAgentLine).join('; ')}`)
  if (pausedMeds.length) lines.push(`Paused medications: ${pausedMeds.map(formatAgentLine).join('; ')}`)
  if (diet) lines.push(`Diet: ${diet}`)
  lines.push('Treat this as personal N-of-1 context, not a prescription. Safety screening stays separate from efficacy ranking.')
  return lines.join('\n')
}
