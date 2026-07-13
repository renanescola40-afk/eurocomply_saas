# Decision: make P1 index strict mode executable and fail closed

- Date: 2026-07-13
- Status: Accepted
- Scope: P1 enterprise evidence validation

## Context

The final P1 evidence runner invokes the index validator with `--strict` during manual enterprise evidence closure. The validator previously treated its first process argument as the index path and did not parse `--strict` as an option.

Consequently, strict execution attempted to read an index file literally named `--strict`. Even after correcting that argument ambiguity, the validator also needed to enforce the documented strict contract rather than applying only normal structural validation.

## Decision

The index validator will:

1. parse `--strict` independently from an optional positional index path;
2. reject unknown options and multiple positional paths;
3. preserve normal pull-request validation for Open, Complete, or Exception states;
4. require `status: Complete` in strict mode;
5. require `generatedFromRealEvidence: true` in strict mode;
6. require every P1 control entry to be `Complete` in strict mode;
7. continue requiring evidence-file existence and review metadata for completed controls.

## Impact

Manual strict P1 evidence validation can now reach the intended control checks instead of failing on argument parsing. The change does not create evidence, change any current control status, or claim enterprise readiness.

The truthful repository state remains whatever is recorded in the canonical index and its generated dashboard.

## Risk

Strict runs that previously failed with a misleading missing-file message will now fail on the actual incomplete control or index state. This is intentional fail-closed behavior.

Normal non-strict pull-request validation remains compatible with incomplete evidence collection.

## Validation

- executable Vitest coverage for strict failure on an incomplete index;
- executable Vitest coverage for strict success on a complete reviewed fixture;
- normal P1 Final Evidence Gate workflow;
- repository lint, typecheck, unit tests, build, security CI, and Vercel preview.

GitHub Actions results on the pull request are the authoritative execution evidence.

## Rollback

Revert the pull request. No database, runtime, environment, credential, or customer-data rollback is required.
