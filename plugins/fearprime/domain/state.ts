export interface DailyStateSnapshot {
  timestamp: string;
  fear: number;
  hypervigilance: number;
  intrusion: number;
  dissociation: number;
  interoceptiveThreat: number;
  socialThreat: number;
  cognitiveClarity: number;
  stress: number;
  energy: number;
  sleepQuality?: number;
  nightmareBurden?: number;
  function?: number;
  confounded: boolean;
}

export interface SleepSnapshot {
  date: string;
  durationHours?: number;
  awakenings?: number;
  nightmareBurden?: number;
  subjectiveQuality?: number;
  restoration?: number;
  source: "manual" | "wearable" | "combined";
  quality?: number;
}

export interface ClinicalStateSnapshot {
  timestamp: string;
  pcl5Total?: number;
  depressionScore?: number;
  anxietyScore?: number;
  insomniaScore?: number;
  function?: number;
  intrusionBurden?: number;
  avoidance?: number;
  hyperarousal?: number;
}

export interface PhysiologicalStateSnapshot {
  timestamp: string;
  heartRate?: number;
  hrv?: number;
  respiration?: number;
  eda?: number;
  systolicBp?: number;
  diastolicBp?: number;
  sourceDevice?: string;
  quality?: number;
  artifactFlag: boolean;
}

export type StateDomain = "clinical" | "sleep" | "autonomic" | "interoceptive" | "social" | "inflammatory";
