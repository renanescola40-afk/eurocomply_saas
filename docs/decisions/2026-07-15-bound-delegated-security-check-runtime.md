# Bound delegated security-check runtime

Date: 2026-07-15
Status: Proposed
Priority: P1 release assurance / security CI availability

## Context

`scripts/security/check-security-responses.mjs` delegates part of its coverage to `scripts/security/check-storage-security.mjs` through `spawnSync`.

The delegated process previously had no execution timeout. A regression, deadlock, accidental long-running operation, or inherited process stall could therefore hold the parent security gate indefinitely instead of producing a deterministic pass or failure. This could block CI runners and obscure whether the response-security gate had actually completed.

This finding is based on repository source. It does not claim that a production release, GitHub runner, or security check has already hung.

## Decision

- cap each delegated security check at two minutes;
- terminate an over-budget child with `SIGTERM`;
- report timeout and signal termination as explicit failures;
- preserve existing fail-closed behavior for missing scripts, execution errors, and non-zero exit status;
- leave the delegated check's security assertions unchanged.

## Impact

The security-response gate now has a deterministic upper bound for each delegated subprocess. Successful delegated checks behave as before. A hung or signalled check fails the gate rather than consuming a runner indefinitely.

No application runtime, API, database, RLS, RBAC, dependency, secret, provider, deployment, or customer-data behavior changes.

## Risks and trade-offs

- a legitimate delegated check that exceeds two minutes will fail and require investigation rather than continuing indefinitely;
- the timeout applies per delegated process, not to the whole workflow;
- `SIGTERM` depends on the runner operating system and child-process behavior, while `spawnSync` still reports timeout failure even if cleanup needs runner intervention;
- source-contract coverage proves the configured fail-closed behavior, not live GitHub runner timing.

## Evidence boundary

Evidence is limited to the repository diff and automated checks on the exact PR head. No runtime evidence, production release evidence, external audit, penetration test, or provider validation is generated or claimed.

## Validation

Relevant focused checks include:

- the security-response script itself;
- `tests/security/security-response-delegation-timeout.test.ts`;
- repository lint, typecheck, unit tests, security suites, build, and release gates in GitHub Actions.

The PR must remain draft and incomplete until required CI is green.

## Rollback

Revert the implementation, test, and this decision record. The delegated process will return to unbounded execution. No migration, data repair, credential rotation, provider action, or deployment rollback is required.
