# PDF lab review contract

A PDF laboratory report is never persisted as confirmed observations directly from OCR/text extraction.

## Review record

Each candidate must expose:

- canonical biomarker name
- extracted value
- extracted unit
- original reference text
- parsed reference low/high when available
- collection date when available
- laboratory when available
- source page
- source locator
- extraction confidence
- warnings

## Confirmation rules

A candidate may only become a `LocalObservation` after explicit confirmation.

The UI must make it possible to edit:

- biomarker
- value
- unit
- collection date
- laboratory
- reference interval

Edits must not remove the original PDF provenance.

## Safety

- Never infer a unit from unrelated rows.
- Never replace the laboratory reference interval with a generic range during import.
- A missing/ambiguous unit or range lowers confidence and keeps the candidate in review.
- OCR errors must not be silently normalized into a confirmed result.
- PDF parsing is an extraction step, not a diagnostic step.
