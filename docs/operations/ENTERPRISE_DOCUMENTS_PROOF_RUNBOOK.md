# Enterprise Documents Runtime Proof Runbook

## Purpose

Validate the exact merged `main` SHA for document lifecycle, forced RLS, immutable versions/reviews, independent approval, integrity-backed publication, export lifecycle and retention governance.

## Protected environment

Create the GitHub environment `production-documents-proof` with required reviewers.

Variables:

- `DOCUMENT_EXPORT_ENCRYPTION_REQUIRED=true`
- `DOCUMENT_RETENTION_POLICY_REVIEWED=true`

## Execution

1. Merge only after exact-head CI and security checks pass.
2. Open **Actions → Enterprise Documents Runtime Proof**.
3. Run the workflow against `main`.
4. Confirm the workflow verifies local HEAD equals current remote `main`.
5. Download `enterprise-documents-evidence-<sha>`.
6. Confirm the validator accepted the evidence and the artifact contains no document content or credentials.
7. Promote controls only when the artifact SHA equals the scorecard SHA.

## Failure handling

- Configuration failure: correct protected variables; never hard-code them.
- SHA mismatch: rerun from the latest `main`.
- Validator failure: keep controls `NOT_VERIFIED` and inspect the named failed control.
- RLS or migration failure: stop rollout and validate in an isolated database before retrying.

## Non-claims

A successful run does not prove legal adequacy, certification, external review, customer acceptance or correctness of generated content.