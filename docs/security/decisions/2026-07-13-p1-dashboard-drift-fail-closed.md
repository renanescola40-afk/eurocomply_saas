# Decision: fail closed on P1 progress dashboard drift

- Date: 2026-07-13
- Status: Accepted
- Scope: P1 enterprise-security evidence governance

## Context

`docs/security/evidence/p1/P1_EVIDENCE_INDEX.json` is the canonical status source for the ten P1 controls. `docs/security/evidence/p1/P1_PROGRESS.md` is generated from that index for human review.

The existing final-evidence runner regenerated the dashboard but treated an uncommitted difference as advisory during normal pull-request validation. That meant a pull request could change the canonical control state while leaving the reviewed progress dashboard stale.

This is an evidence-integrity gap. It does not prove that any security control is implemented or absent, but it can present reviewers with conflicting status information.

## Decision

The generated dashboard consistency check is mandatory in both normal and strict modes.

Normal pull-request mode still permits missing final P1 evidence files. Strict mode still requires all ten final evidence files and complete index state. The only behavior changed here is that the committed dashboard must always match the canonical index.

## Impact

- P1 status changes must include the regenerated dashboard in the same pull request.
- Evidence completeness remains unchanged at 1/10 until real reviewed artifacts justify further status changes.
- No runtime application code, production environment, database, secret, or customer data is changed.

## Risk

The stricter gate can fail pull requests that previously passed with stale generated documentation. This is intentional and is resolved by running the documented generator and committing the resulting dashboard.

## Validation

- Run `node scripts/security/run-p1-final-evidence-gate.mjs`.
- Run `npm run test -- tests/security/p1-final-evidence-dashboard-integrity.test.ts`.
- Run repository lint, typecheck, unit tests, build, security CI, and the P1 Final Evidence Gate workflow.

No runtime evidence is claimed by this decision record.

## Rollback

Revert the pull request. No data rollback, environment rollback, or migration rollback is required.
