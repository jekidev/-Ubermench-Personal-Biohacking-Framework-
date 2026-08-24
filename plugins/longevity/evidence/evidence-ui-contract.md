# Evidence UI Contract

## Evidence card

Each evidence item displays:

- subject
- claim
- evidence type
- grade
- status
- source title
- publication date when available
- access/review date
- version
- population/endpoint when known
- superseded-by / supersedes relationship

## Status states

- `active`
- `needs-review`
- `insufficient-evidence`
- `superseded`

## Interpretation boundary

The UI must visually distinguish:

```text
Observed measurement
        ↓
Evidence-supported context
        ↓
Bounded interpretation
        ↓
Hypothesis (when applicable)
```

A hypothesis must never render as established clinical evidence.

## Auditability

Selecting an evidence claim should reveal the exact registry record/version used to generate the displayed context. Updating a source creates a new version rather than silently modifying the prior record.
