# P1 Final Evidence File Shape

This document describes the governance shape enforced by `scripts/security/check-p1-final-evidence-files.mjs`.

The checker does not create evidence and does not mark controls complete. It validates only committed final evidence JSON files under `docs/security/evidence/p1/`.

Each final evidence file must represent one P1 control and include:

- `schemaVersion: 1`
- matching `controlId` and `control`
- `status: "Complete"`
- `evidenceKind: "final-p1-control-evidence"`
- `generatedFromRealEvidence: true`
- `productionValidated: true`
- `environment: "production"`
- `targetEnvironment: "production"`
- non-empty `generatedAt`, `reviewedAt`, `reviewer`, and `nextReviewDue`
- `validation.result: "pass"` with non-empty validation metadata
- at least one artifact with type, reference, description, and collection time

The explicit production fields prevent a staging, local, preview, or test result from being represented as final production evidence merely by setting `productionValidated: true`.

Placeholder-like values such as TBD, TODO, sample, fake, mock, dummy, or changeme are rejected.

Non-strict mode allows missing final files so preparatory PRs can merge. Strict mode requires all 10 final files and should only be used for final evidence readiness.
