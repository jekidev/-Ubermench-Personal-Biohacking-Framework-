# Longevity plugin

Longevity is the evidence-weighted healthspan/lifespan decision-support plugin for the Ubermench Personal Biohacking Framework.

## Scope

- Daily and weekly health dashboard
- Blood pressure and resting-heart-rate trends
- HRV, sleep and training-load integration when wearable data is available
- Cardiorespiratory fitness and strength tracking
- Lipids, ApoB, glucose/HbA1c, kidney, liver and inflammatory markers
- Preventive-care and screening reminders
- Medication/supplement tracking with indication and evidence fields
- Geroscience research watchlist
- N-of-1 intervention tracking with baseline, exposure, washout and outcome windows
- Evidence grading and source versioning
- Safety flags and clinician-review handoffs
- Review-first blood-test and DNA import
- Local source-document provenance and append-only biomarker history
- Native Tauri PDF extraction boundary

## PDF import architecture

```text
PDF
 ↓
Tauri native extractor
 ↓
page-level text + extraction method
 ↓
Longevity parser
 ↓
biomarker candidates
 ↓
confidence + reference interval + source page
 ↓
editable review
 ↓
explicit confirmation
 ↓
local append-only store
```

The importer must fail closed when extraction is unavailable or ambiguous. It must never invent a laboratory value. Scanned PDFs may be routed to an explicit OCR adapter; OCR output must retain its extraction method and confidence.

## Design rule

The plugin optimizes for preserving health and function while maintaining a conservative path toward emerging longevity technologies. It must distinguish clinical prevention from experimental geroscience.

No autonomous prescribing, dose adjustment or treatment escalation is allowed.

## Dashboard pillars

1. Cardiovascular risk
2. Metabolic health
3. Fitness and body composition
4. Sleep and recovery
5. Organ health
6. Prevention and screening
7. Intervention/evidence tracking
8. Geroscience watchlist

## Status model

Each metric can be `unknown`, `baseline`, `stable`, `improving`, `declining`, or `needs_review`.
