import { describe, expect, it } from "vitest";
import { assessF2ThreatSafetyDiscrimination, assessF9SafetyRuleRetrieval } from "../engine/learning-phenotypes";

describe("Fearprime PTSD learning phenotypes", () => {
  it("flags weak threat-safety discrimination", () => {
    const result = assessF2ThreatSafetyDiscrimination([
      { threatResponse: 70, safetyResponse: 65, context: "same", valid: true },
      { threatResponse: 72, safetyResponse: 68, context: "same", valid: true },
      { threatResponse: 75, safetyResponse: 60, context: "different", valid: true }
    ]);

    expect(result.status).toBe("probable");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("does not flag strong discrimination", () => {
    const result = assessF2ThreatSafetyDiscrimination([
      { threatResponse: 90, safetyResponse: 20, context: "same", valid: true },
      { threatResponse: 88, safetyResponse: 15, context: "same", valid: true },
      { threatResponse: 92, safetyResponse: 18, context: "different", valid: true }
    ]);

    expect(result.status).toBe("resolved");
  });

  it("detects safety-rule retrieval difficulty under activation", () => {
    const result = assessF9SafetyRuleRetrieval([
      { threatActive: true, safetyRuleCorrect: false, responseConfidence: 80, valid: true },
      { threatActive: true, safetyRuleCorrect: false, responseConfidence: 70, valid: true },
      { threatActive: true, safetyRuleCorrect: true, responseConfidence: 80, valid: true },
      { threatActive: false, safetyRuleCorrect: true, responseConfidence: 90, valid: true }
    ]);

    expect(result.status).toBe("possible");
  });
});
