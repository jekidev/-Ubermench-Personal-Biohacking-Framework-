import type { BiomarkerRecord } from '~/types/biology'

export type PhenotypicAgeInputs = {
  albumin_g_per_L?: number
  creatinine_umol_per_L?: number
  glucose_mmol_per_L?: number
  crp_mg_per_L?: number
  lymphocyte_percent?: number
  mcv_fL?: number
  rdw_ratio?: number
  alp_U_per_L?: number
  wbc_10e9_per_L?: number
  chronologicalAgeYears: number
}

export type PhenotypicAgeResult = {
  phenotypicAgeYears: number | null
  ageDeltaYears: number | null
  availableMarkers: string[]
  missingMarkers: string[]
  confidence: 'low' | 'medium' | 'high'
  disclaimer: string
}

const REQUIRED_MARKERS = [
  'albumin',
  'creatinine',
  'glucose',
  'crp',
  'lymphocyte_percent',
  'mcv',
  'rdw',
  'alp',
  'wbc',
] as const

const MARKER_FIELDS: Record<(typeof REQUIRED_MARKERS)[number], keyof PhenotypicAgeInputs> = {
  albumin: 'albumin_g_per_L',
  creatinine: 'creatinine_umol_per_L',
  glucose: 'glucose_mmol_per_L',
  crp: 'crp_mg_per_L',
  lymphocyte_percent: 'lymphocyte_percent',
  mcv: 'mcv_fL',
  rdw: 'rdw_ratio',
  alp: 'alp_U_per_L',
  wbc: 'wbc_10e9_per_L',
}

function findBiomarkerValue(biomarkers: BiomarkerRecord[], names: string[]): number | undefined {
  const normalized = names.map((name) => name.toLowerCase())
  const match = biomarkers
    .slice()
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    .find((item) => normalized.some((name) => item.name.toLowerCase().includes(name)))
  return match?.value
}

export function biomarkersToPhenotypicInputs(
  biomarkers: BiomarkerRecord[],
  chronologicalAgeYears: number,
): PhenotypicAgeInputs {
  return {
    chronologicalAgeYears,
    albumin_g_per_L: findBiomarkerValue(biomarkers, ['albumin']),
    creatinine_umol_per_L: findBiomarkerValue(biomarkers, ['creatinine', 'kreatinin']),
    glucose_mmol_per_L: findBiomarkerValue(biomarkers, ['glucose', 'glukose']),
    crp_mg_per_L: findBiomarkerValue(biomarkers, ['crp', 'c-reaktivt']),
    lymphocyte_percent: findBiomarkerValue(biomarkers, ['lymphocyte', 'lymfocyt']),
    mcv_fL: findBiomarkerValue(biomarkers, ['mcv', 'erytrocytvolumen']),
    rdw_ratio: findBiomarkerValue(biomarkers, ['rdw', 'erytrocytvol']),
    alp_U_per_L: findBiomarkerValue(biomarkers, ['alp', 'basisk fosfatase', 'alkaline phosphatase']),
    wbc_10e9_per_L: findBiomarkerValue(biomarkers, ['leukocyte', 'leukocyt', 'wbc']),
  }
}

/**
 * Levine et al. 2018 phenotypic age (simplified coefficients).
 * Units: albumin g/L (converted to g/dL), creatinine µmol/L, glucose mmol/L, CRP mg/L, lymph %, MCV fL, RDW %, ALP U/L, WBC 10^9/L.
 */
export function computePhenotypicAge(inputs: PhenotypicAgeInputs): PhenotypicAgeResult {
  const available: string[] = []
  const missing: string[] = []

  for (const marker of REQUIRED_MARKERS) {
    const key = MARKER_FIELDS[marker]
    if (inputs[key] !== undefined && inputs[key] !== null) available.push(marker)
    else missing.push(marker)
  }

  if (missing.length > 0) {
    return {
      phenotypicAgeYears: null,
      ageDeltaYears: null,
      availableMarkers: available,
      missingMarkers: missing,
      confidence: 'low',
      disclaimer: 'Phenotypic age requires nine standard blood biomarkers. This is a research estimate, not a clinical diagnosis.',
    }
  }

  // Levine 2018: albumin/creatinine in US units; glucose in mmol/L; CRP in mg/L (ln).
  const albumin = inputs.albumin_g_per_L! / 10
  const creatinine = inputs.creatinine_umol_per_L! / 88.4
  const glucose = inputs.glucose_mmol_per_L!
  const crp = Math.log(Math.max(inputs.crp_mg_per_L!, 0.01))
  const lymph = inputs.lymphocyte_percent!
  const mcv = inputs.mcv_fL!
  const rdw = inputs.rdw_ratio!
  const alp = inputs.alp_U_per_L!
  const wbc = inputs.wbc_10e9_per_L!

  const xb =
    -19.9067
    - 0.0336 * albumin
    + 0.0095 * creatinine
    + 0.1953 * glucose
    + 0.0954 * crp
    - 0.0120 * lymph
    + 0.0268 * mcv
    + 0.3306 * rdw
    + 0.00188 * alp
    + 0.0554 * wbc
    + 0.0804 * inputs.chronologicalAgeYears

  const gamma = 0.0076927
  let mortalityScore = 1 - Math.exp((-Math.exp(xb) * (Math.exp(120 * gamma) - 1)) / gamma)
  mortalityScore = Math.max(1e-6, Math.min(0.999999, mortalityScore))

  if (!Number.isFinite(mortalityScore)) {
    return {
      phenotypicAgeYears: null,
      ageDeltaYears: null,
      availableMarkers: available,
      missingMarkers: [],
      confidence: 'low',
      disclaimer: 'Phenotypic age could not be computed from the supplied biomarker values.',
    }
  }

  const phenotypicAge = 141.50225 + Math.log(-0.00553 * Math.log(1 - mortalityScore)) / 0.090165
  const ageDelta = phenotypicAge - inputs.chronologicalAgeYears

  return {
    phenotypicAgeYears: Math.round(phenotypicAge * 10) / 10,
    ageDeltaYears: Math.round(ageDelta * 10) / 10,
    availableMarkers: available,
    missingMarkers: [],
    confidence: available.length >= 9 ? 'high' : available.length >= 6 ? 'medium' : 'low',
    disclaimer: 'Phenotypic age is a population-derived research estimate. It does not replace clinical assessment.',
  }
}
