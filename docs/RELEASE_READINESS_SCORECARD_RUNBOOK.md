# Release Readiness Scorecard Runbook

This runbook explains how to use the release readiness scorecard before promoting EuroComply to private beta, public production, or enterprise rollout.

## Purpose

The scorecard turns the release decision into a measurable operational review.
It complements, but does not replace:

- `docs/RELEASE_CANDIDATE_VALIDATION.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_OPERATIONS_INDEX.md`

## Command

Run the scorecard gate directly:

```bash
node scripts/security/check-release-readiness-scorecard.mjs
```

When package script wiring is available, expose it as:

```bash
npm run security:release-scorecard
```

and include it in:

```bash
npm run release:readiness
```

## Review sequence

1. Confirm the promoted commit SHA.
2. Attach build and Security CI evidence.
3. Attach supply-chain and audit evidence.
4. Attach Supabase live validation evidence.
5. Attach audit-chain transactional validation evidence.
6. Attach billing and webhook evidence.
7. Attach rollback and incident-response ownership.
8. Score each readiness area from `0` to `3`.
9. Apply automatic No-Go overrides.
10. Record the final decision in the approval record.

## Scoring interpretation

- `0-17`: No-Go
- `18-26`: private beta only
- `27-32`: production candidate with explicit exceptions
- `33-36`: enterprise candidate, pending final approval

## Evidence requirements

A score of `3` requires evidence, not only implementation.
Examples of valid evidence include:

- successful CI run URL or artifact
- build/deploy log
- live validation report
- audit summary
- release approval record
- rollback owner confirmation
- incident-response owner confirmation
- customer-communication readiness note

## Automatic No-Go review

Before approving a release, confirm that none of the automatic No-Go conditions in `docs/RELEASE_READINESS_SCORECARD.md` apply.
If any automatic No-Go applies, the release must not proceed unless the Go/No-Go document records a formally approved exception.

## Enterprise rule

Enterprise release requires the scorecard, evidence checklist, approval record, Go/No-Go decision, and operations index to agree.
If they conflict, the strictest result wins.
