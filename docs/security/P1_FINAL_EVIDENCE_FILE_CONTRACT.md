# P1 Final Evidence File Contract

This document defines the minimum governance contract for final P1 evidence files.

It does not create evidence, validate production behavior, or mark any P1 control complete.

A final P1 evidence file is acceptable only when it is real, reviewed, and validated. Each final file should include:

- `schemaVersion: 1`
- `phase: "P1 Enterprise Security"`
- the expected `controlId`
- the expected `control`
- `status: "Complete"`
- `generatedFromRealEvidence: true`
- `generatedAt`
- `reviewedAt`
- `reviewer`
- `validatedAt`
- `validator`
- `validationStatus: "Passed"`
- `nextReviewDue`
- non-empty `evidenceItems`

Each `evidenceItems` entry should identify the evidence type, source system, stable reference, and observation time.

The P1 index must remain `Open` with `generatedFromRealEvidence: false` until all 10 final evidence files exist and pass review.
