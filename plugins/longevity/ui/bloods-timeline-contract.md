# Bloods Timeline UI Contract

The timeline is the canonical longitudinal view of confirmed laboratory observations.

## Views

- Latest confirmed result
- Full history
- Date-range comparison
- Trend
- Source/provenance
- Import history

## Biomarker row

Each row exposes:

- canonical biomarker name
- value and unit
- collection date
- laboratory/source
- original reference interval
- change from previous observation
- change from baseline when available
- observation count
- source document
- extraction method

## Trend rules

- Do not classify a trend with fewer than two comparable observations.
- Never compare incompatible units.
- Preserve original values and units.
- Relative change is shown only when mathematically meaningful.
- Reference intervals are displayed as laboratory-provided context, not as a diagnosis.

## Import provenance

Every displayed observation links back to its source document and import event. Corrections create a new event rather than rewriting history.

## Safety

The timeline is observational. It does not prescribe medication, diagnose disease, or automatically change an intervention plan.
