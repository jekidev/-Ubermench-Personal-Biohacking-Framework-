# Longevity Bloods — Import Flow

## Goal

Provide a safe, review-first UI flow for adding recurring laboratory results to the Longevity dashboard.

## User flow

1. Open `Longevity → Bloods → Add blood test`.
2. Select a PDF, CSV, TSV, or JSON source.
3. Parse locally when possible; never silently invent values.
4. Show an editable preview before persistence.
5. For each result display:
   - biomarker
   - value
   - unit
   - collection date
   - laboratory/source
   - original reference interval
   - extraction confidence
   - source page/locator when available
   - warnings
6. User confirms or edits the preview.
7. Persist the confirmed result as an append-only historical event.
8. Recalculate the biomarker timeline and dashboard trends.

## Safety rules

- Never overwrite an existing historical result.
- Never silently convert an ambiguous unit.
- Preserve the laboratory's original reference interval.
- Preserve the original source document fingerprint.
- Low-confidence extraction must require user confirmation.
- Unsupported PDF layouts fall back to manual entry rather than fabricated extraction.
- The import layer stores observations; it does not diagnose disease or prescribe medication.

## Timeline view

Each biomarker timeline should expose:

- first recorded value/date
- latest confirmed value/date
- absolute change
- relative percentage change when mathematically meaningful
- trend: rising / falling / stable / insufficient-data
- number of observations
- source provenance

## Example

```text
ApoB

2026-08-24   0.82 g/L
2026-11-24   0.76 g/L
2027-02-24   0.71 g/L

Trend: falling
Change: -0.11 g/L (-13.4%)
Observations: 3
```

## Local-first architecture

```text
File picker
   ↓
Local parser
   ↓
Normalized observation candidates
   ↓
Validation + confidence + warnings
   ↓
Editable preview
   ↓
Explicit confirmation
   ↓
Append-only local store
   ↓
Longitudinal timeline
   ↓
Dashboard analytics
```
