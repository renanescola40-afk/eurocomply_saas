# P1 Final Evidence File Contract

This document defines the minimum governance contract for final P1 evidence files.

It does not create evidence, validate production behavior, or mark any P1 control complete.

A final P1 evidence file is acceptable only when it is real, reviewed, production-validated, and backed by stable artifacts. Each final file must include:

- `schemaVersion: 1`
- the expected `controlId`
- the expected `control`
- `status: "Complete"`
- `evidenceKind: "final-p1-control-evidence"`
- `generatedFromRealEvidence: true`
- `productionValidated: true`
- `generatedAt`
- `reviewedAt`
- `reviewer`
- `nextReviewDue`
- `environment`
- `validation.result: "pass"`
- `validation.validatedAt`
- `validation.validator`
- `validation.method`
- non-empty `artifacts`

Each `artifacts` entry must include:

- `type`
- `reference`
- `description`
- `collectedAt`

The checker rejects placeholder-like strings such as TODO, TBD, sample, dummy, fake, mock, lorem ipsum, changeme, N/A, and none.

The P1 index must remain `Open` with `generatedFromRealEvidence: false` until all 10 final evidence files exist, pass validation, and are reviewed.
