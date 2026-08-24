# Evidence ingestion contract

## Accepted identifiers

- PMID
- DOI
- canonical URL

## Import flow

```text
source identifier
 ↓
normalize identifier
 ↓
resolve metadata (explicit user action)
 ↓
preview
 ↓
duplicate check
 ↓
confirm
 ↓
local evidence registry
```

## Deduplication

DOI is the strongest deduplication key, followed by PMID, then normalized title when no persistent identifier exists.

A duplicate source must not create a second active evidence record.

## Versioning

A new paper can replace an older interpretation by creating a new version and marking the old record `superseded`. The original record remains auditable.

## Safety

Metadata retrieval does not equal evidence validation. The importer must never assign an evidence grade merely because a source exists. Evidence grading remains a separate reviewed step.

No raw health or genetic data is transmitted with a literature lookup request.
