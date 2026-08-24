/** Fearprime v0.1 derived metrics. Raw observations remain source-of-truth. */

export interface LearningSnapshot {
  threatExpectancyPre: number;
  threatExpectancyPost: number;
  safetyExpectancyPre: number;
  safetyExpectancyPost: number;
  expectedProbability: number;
  actualOutcomeProbability: number;
}

export function threatChange(s: LearningSnapshot): number {
  return s.threatExpectancyPost - s.threatExpectancyPre;
}

export function safetyGain(s: LearningSnapshot): number {
  return s.safetyExpectancyPost - s.safetyExpectancyPre;
}

export function predictionError(s: LearningSnapshot): number {
  return Math.abs(s.expectedProbability - s.actualOutcomeProbability);
}

export function discriminationGap(threatResponse: number, safetyResponse: number): number {
  return threatResponse - safetyResponse;
}

export function retentionScore(baseline: number, followUp: number): number {
  return baseline === 0 ? 0 : followUp / baseline;
}
