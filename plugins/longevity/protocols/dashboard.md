# Longevity Dashboard Protocol v1

## Daily capture

Record, when available:

- blood pressure: two seated readings, one minute apart
- resting heart rate
- body weight
- sleep duration and subjective recovery
- exercise session and duration
- unusual symptoms, adverse events or medication changes

## Weekly aggregation

Calculate:

- 7-day average blood pressure
- 7-day resting-heart-rate median/average
- body-weight trend
- training volume and frequency
- aerobic and strength-training consistency
- sleep-duration trend
- HRV trend when wearable data is available

## Laboratory review

Import lab values with date, laboratory reference interval and fasting/non-fasting context where relevant.

Priority domains:

1. ApoB / LDL-C / triglycerides
2. HbA1c / fasting glucose
3. creatinine / eGFR / urine ACR
4. ALT / AST / GGT
5. CBC
6. CRP when clinically useful
7. Lp(a), generally as a once-in-life risk marker unless clinically indicated otherwise

## Scoring rule

The dashboard does not create a single "biological age" number as the primary output. It displays domain scores and trends so a user can see which modifiable factor is most actionable.

## Safety rule

A single abnormal value should create a `needs_review` state rather than an automated diagnosis. Repeated abnormalities, rapid changes or safety thresholds can create a clinician-review flag.

## Intervention rule

Before and after an intervention, capture:

- indication/hypothesis
- baseline window
- intervention window
- dose/exposure, if applicable
- adherence
- outcome metrics
- adverse events
- stop criteria

The system must never autonomously prescribe, titrate or discontinue prescription medication.
