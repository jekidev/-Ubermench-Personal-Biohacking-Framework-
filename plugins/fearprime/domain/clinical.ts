export type ClinicalInstrument = "PCL5" | "CAPS5" | "PHQ9" | "GAD7" | "ISI" | "OTHER";

export interface ClinicalAssessmentRecord {
  id: string;
  patientId: string;
  instrument: ClinicalInstrument;
  instrumentVersion: string;
  timestamp: string;
  totalScore?: number;
  subscaleScores?: Record<string, number>;
  completedBy: "patient" | "clinician";
  source: "manual" | "import";
  notes?: string;
}

export interface ClinicalOutcomeTrend {
  instrument: ClinicalInstrument;
  n: number;
  firstScore?: number;
  latestScore?: number;
  delta?: number;
  direction: "improved" | "worsened" | "stable" | "insufficient_data";
}

export function summarizeClinicalTrend(records: ClinicalAssessmentRecord[], instrument: ClinicalInstrument): ClinicalOutcomeTrend {
  const matching = records
    .filter((record) => record.instrument === instrument && typeof record.totalScore === "number")
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (matching.length < 2) {
    return { instrument, n: matching.length, direction: "insufficient_data" };
  }

  const firstScore = matching[0]?.totalScore;
  const latestScore = matching[matching.length - 1]?.totalScore;
  const delta = typeof firstScore === "number" && typeof latestScore === "number" ? latestScore - firstScore : undefined;

  return {
    instrument,
    n: matching.length,
    firstScore,
    latestScore,
    delta,
    direction: delta === undefined ? "insufficient_data" : delta < 0 ? "improved" : delta > 0 ? "worsened" : "stable"
  };
}
