# Longevity dashboard UI contract v0.1

## Header

Show:

- Longevity status: `baseline`, `stable`, `improving`, `needs_review`
- last sync time
- missing-data indicator
- safety flag count

## Primary cards

### Cardiovascular

- 7-day BP
- resting HR
- ApoB/LDL trend
- Lp(a) status

### Metabolic

- HbA1c
- fasting glucose
- triglycerides
- waist / weight trend

### Fitness

- weekly aerobic minutes
- running frequency
- strength sessions
- VO2max/fitness estimate when available

### Recovery

- sleep duration
- sleep consistency
- HRV trend
- training recovery trend

### Organ health

- eGFR / creatinine
- urine ACR
- liver enzymes

## Research panel

Show the top current geroscience candidates with:

`intervention → target → human evidence grade → hard-outcome evidence → known risks → trial status → last reviewed`

This panel is informational and must not present experimental interventions as prescriptions.

## Next-best-data panel

Prioritize missing measurements that most reduce uncertainty, for example:

- repeated home BP if baseline is incomplete
- ApoB if cardiovascular risk is incompletely characterized
- urine ACR if kidney risk is incompletely characterized
- fitness test if fitness trend is unknown

The engine should prefer better measurement over adding another supplement or medication.
