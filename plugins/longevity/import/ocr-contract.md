# OCR contract for scanned laboratory reports

OCR is an explicit fallback for PDFs with no usable native text layer.

## Flow

```text
PDF
 ↓
native text extraction
 ↓ (empty/insufficient)
OCR adapter
 ↓
page text + confidence
 ↓
biomarker parser
 ↓
review required
```

## Rules

- OCR output is always marked `ocr` and never treated as equivalent to native text.
- Every candidate retains page provenance.
- Low-confidence OCR candidates require manual confirmation.
- Ambiguous decimal separators, units, or reference intervals must produce warnings.
- OCR never directly persists a result.
- No cloud OCR is required by the core architecture.

## Adapter boundary

The OCR adapter accepts PDF bytes and returns page-level text plus confidence metadata. The concrete OCR engine is replaceable; the Longevity parser must not depend on a vendor-specific OCR API.

## Timeline handoff

Only confirmed observations enter the append-only biomarker timeline. OCR uncertainty therefore remains visible in import history and cannot silently alter longitudinal data.
