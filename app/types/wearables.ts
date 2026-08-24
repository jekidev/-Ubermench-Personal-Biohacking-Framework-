export interface WearableObservation { id: string; recordedAt: string; metric: 'sleepDuration' | 'sleepEfficiency' | 'restingHeartRate' | 'hrv' | 'steps' | 'activityMinutes' | 'respiratoryRate' | 'temperature' | 'glucose'; value: number; unit: string; source: string }

export interface WearableImport { source: string; observations: WearableObservation[]; importedAt: string }
