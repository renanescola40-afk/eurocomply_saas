# Enterprise Operations Platform Closeout Runbook

## Purpose

Operate the final repository-controlled productization and runtime closeout without producing false completion claims.

## Before implementation

- Confirm the branch is based on current `main`.
- Inventory open PRs touching Digital Twin, evidence, regulatory impact, billing, RLS, workflows, or closeout.
- Close or supersede duplicates before copying changes.
- Record the current main SHA.

## During implementation

- Keep commits grouped by domain.
- Run focused tests after each domain commit.
- Do not weaken RLS, authorization, rate limits, no-store, origin, or evidence integrity to make tests pass.
- Keep migrations additive and use explicit constraints and indexes.
- Preserve historical evidence and regulatory decisions through supersession.

## Before ready-for-review

Run the authoritative repository commands for install, lint, typecheck, tests, build, security, workflows, migrations, RLS, billing, and E2E. Resolve all repository-controlled failures.

Verify the PR contains:

- implementation;
- tests;
- migrations where required;
- security contracts;
- UI states;
- i18n coverage;
- ADRs;
- changelog;
- rollback notes;
- truthful limitations.

## After merge

1. Freeze the exact current main SHA.
2. Apply and verify Supabase migrations in the protected environment.
3. Run live RLS and tenant-isolation validation.
4. Run Stripe entitlement and add-on runtime proof.
5. Wait for trusted Vercel deployment of the exact main SHA.
6. Run production smoke, health, readiness, headers, no-store, observability, and rollback validation.
7. Capture legal-rules and product runtime artifacts.
8. Promote artifacts only through provenance-validating draft PRs.
9. Human-review and merge accepted evidence.
10. Run the final protected closeout orchestrator.

## Failure handling

- SHA mismatch: stop and rerun all commit-bound evidence for current main.
- Stale artifact: reject and preserve it; never rewrite its provenance.
- Stripe mismatch: inspect event, subscription, organization metadata, entitlement snapshot, seat policy, and reconciliation records.
- RLS failure: block release, identify the exact policy/table/path, patch additively, and rerun negative cross-tenant tests.
- Vercel failure: preserve logs, rollback to the last known-good deployment, fix through a reviewed PR, and regenerate all exact-SHA evidence.
- Promotion conflict: do not overwrite a different PASS artifact; open an incident and reconcile provenance.

## Completion check

The closeout is complete only when the protected final artifact has:

- `status: Complete`;
- `decision: CONVERSATION_COMPLETE`;
- `completionPercentage: 100`;
- no blockers;
- one current main SHA across every mandatory artifact.

If engineering is complete but human reviews are pending, report `REPOSITORY_SCOPE_COMPLETE` and `HUMAN_EXECUTION_PENDING`.
