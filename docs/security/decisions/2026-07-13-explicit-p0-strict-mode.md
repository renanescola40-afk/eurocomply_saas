# Decision: explicit P0 runtime strict mode must fail closed

Date: 2026-07-13
Status: Proposed in draft pull request
Scope: repository release-control script only

## Context

`npm run security:p0-runtime-gap:strict` passed `--strict` to `report-p0-runtime-evidence-gap.mjs`, but the script enforced failure only when additional environment, workflow, or branch-name conditions were also true. A developer or release operator could therefore invoke the explicitly strict command locally or from another workflow, receive a zero exit code while P0 runtime evidence remained incomplete, and reasonably misinterpret that result as a closed gate.

The existing `P0 Final Release Gate` workflow already decides when strict enforcement is appropriate and only invokes the script with `--strict` in those cases. The script does not need a second context-dependent downgrade.

## Decision

Treat `--strict` as an explicit fail-closed contract:

- when `--strict` is present and any required runtime evidence is incomplete, exit non-zero;
- when `--strict` is absent, preserve the reporting-only behavior;
- retain workflow and branch context fields in the JSON report for diagnostics, not for weakening enforcement.

## Impact

This changes repository release-control behavior only. It does not modify application runtime, production infrastructure, database state, secrets, customer data, or runtime evidence files.

Callers that previously passed `--strict` outside the final-release contexts will now receive the failure that the command name and argument already promise.

## Risk

Low. The principal risk is exposing previously hidden incomplete evidence in ad hoc jobs or local validation. That is intentional and safer than silently downgrading an explicit strict request.

## Tests and evidence

`tests/security/p0-runtime-gap-strict-contract.test.ts` locks the explicit strict-mode contract and preserves the non-strict reporting path. GitHub Actions on the draft pull request are the authoritative execution evidence. No production, audit, pentest, or runtime validation evidence is claimed.

## Rollback

Revert the pull request. No data, environment, deployment, or infrastructure rollback is required.
