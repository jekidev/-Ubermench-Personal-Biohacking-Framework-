export type DataSource = 'manual' | 'lab-import' | 'wearable' | 'genomics-import' | 'model' | 'api'
export type EvidenceLevel = 'meta-analysis' | 'randomized-trial' | 'human-study' | 'observational' | 'mechanistic' | 'animal' | 'in-silico' | 'expert-opinion'

export interface BiomarkerRecord { id: string; name: string; value: number; unit: string; measuredAt: string; source: DataSource; referenceLow?: number; referenceHigh?: number; labName?: string; notes?: string }
export interface VariantRecord { id: string; chromosome?: string; position?: number; rsId?: string; gene?: string; referenceAllele?: string; alternateAllele?: string; genotype: string; zygosity?: 'heterozygous' | 'homozygous' | 'unknown'; source: DataSource }
export interface MedicationRecord { id: string; name: string; dose?: string; frequency?: string; startedAt?: string; stoppedAt?: string; active: boolean }
export interface SupplementRecord { id: string; name: string; dose?: string; frequency?: string; active: boolean }
export interface SymptomRecord { id: string; name: string; severity?: number; recordedAt: string; notes?: string }
export interface SleepRecord { id: string; recordedAt: string; durationMinutes?: number; efficiency?: number; restingHeartRate?: number; hrv?: number; source: DataSource }
export interface TrainingRecord { id: string; recordedAt: string; activity: string; durationMinutes?: number; intensity?: number; load?: number }
export interface PersonalBiologyProfile { version: 1; biomarkers: BiomarkerRecord[]; variants: VariantRecord[]; medications: MedicationRecord[]; supplements: SupplementRecord[]; symptoms: SymptomRecord[]; sleep: SleepRecord[]; training: TrainingRecord[]; goals: string[]; updatedAt: string }
export interface EvidenceItem { id: string; title: string; source: string; url?: string; evidenceLevel: EvidenceLevel; confidence: number; publishedAt?: string; summary?: string }
export interface InterventionCandidate { id: string; name: string; mechanism?: string; expectedBenefits: string[]; risks: string[]; interactions: string[]; evidence: EvidenceItem[]; personalFit: number; priority: number }
export interface ModelRun<T = unknown> { id: string; modelId: string; task: string; inputHash?: string; startedAt: string; completedAt?: string; status: 'queued' | 'running' | 'completed' | 'failed'; output?: T; error?: string }
