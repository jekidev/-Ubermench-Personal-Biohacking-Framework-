export type HealthDomain = 'cardiovascular' | 'metabolic' | 'inflammation' | 'renal' | 'hepatic' | 'hematology' | 'fitness' | 'recovery'

export type MatrixObservation = {
  biomarker: string
  value: number
  unit: string
  collectedAt: string
  referenceLow?: number
  referenceHigh?: number
}

export type DomainSnapshot = {
  domain: HealthDomain
  observations: MatrixObservation[]
  coverage: 'none' | 'limited' | 'good'
}

const DOMAIN_MAP: Record<string, HealthDomain> = {
  apob: 'cardiovascular',
  'ldl-c': 'cardiovascular',
  hdl: 'cardiovascular',
  triglycerides: 'metabolic',
  hba1c: 'metabolic',
  glucose: 'metabolic',
  crp: 'inflammation',
  creatinine: 'renal',
  egfr: 'renal',
  alt: 'hepatic',
  ast: 'hepatic',
  hemoglobin: 'hematology',
}

export function domainForBiomarker(name: string): HealthDomain | undefined {
  return DOMAIN_MAP[name.trim().toLowerCase()]
}

export function buildHealthMatrix(observations: MatrixObservation[]): DomainSnapshot[] {
  const domains: HealthDomain[] = ['cardiovascular', 'metabolic', 'inflammation', 'renal', 'hepatic', 'hematology', 'fitness', 'recovery']
  return domains.map((domain) => {
    const matches = observations.filter((item) => domainForBiomarker(item.biomarker) === domain)
    const unique = new Set(matches.map((item) => item.biomarker.toLowerCase()))
    return {
      domain,
      observations: matches,
      coverage: unique.size >= 2 ? 'good' : unique.size === 1 ? 'limited' : 'none',
    }
  })
}
