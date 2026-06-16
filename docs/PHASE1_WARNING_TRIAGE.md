# Phase 1 Warning Triage

This policy defines how warnings found during Phase 1 validation are handled.

## Sources

Warnings can come from:

- `docs/evidence/phase1/npm-audit.log`
- `docs/evidence/phase1/typecheck.log`
- `docs/evidence/phase1/test.log`
- `docs/evidence/phase1/build.log`
- `docs/evidence/phase1/lint.log`
- `docs/evidence/phase1/dev-smoke.log`

## Blocking warnings

Phase 1 is blocked by any warning that indicates:

1. A high or critical security finding.
2. A build optimization or runtime behavior that can break production output.
3. A TypeScript or lint warning that hides an unsafe cast, unused auth/tenant guard, or ignored error path.
4. A test warning that indicates skipped, flaky, or silently failing coverage.
5. A local startup warning that prevents the app from serving a stable HTTP response.

## Non-blocking warnings

A warning can be accepted only when:

1. It has no runtime, security, tenant isolation, billing, or data-loss impact.
2. It is documented with the owner, reason, and follow-up date.
3. The related command exits with code 0.
4. The exception is reviewed before marking Phase 1 complete.

## Required warning evidence

If warnings remain, add a short note to the related evidence log or a follow-up document that includes:

- Warning summary.
- Impact assessment.
- Owner.
- Follow-up date.
- Decision: blocking or accepted.

## Completion rule

Phase 1 cannot be marked complete while any blocking warning remains unresolved.
