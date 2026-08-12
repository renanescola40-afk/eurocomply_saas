# P0 authoritative Enterprise Production Gate fan-in

## Problem

The authoritative `P0 Runtime Evidence` workflow produced the immutable exact-SHA P0 register, but it did not observe `Enterprise Production Gate` completions and did not call the existing `fetch-production-gate-p0-evidence.mjs` hydrator.

That left four release-runtime controls dependent on checkout snapshots even when an exact-main-SHA Production Gate artifact existed:

- deployment smoke validation;
- final validation runner;
- observability smoke validation;
- rollback dry-run validation.

The secondary `P0 Runtime Gap Report` already used the Production Gate hydrator, so the diagnostic report and the authoritative register could disagree.

## Decision

`P0 Runtime Evidence` now observes `Enterprise Production Gate` completions and hydrates the four supported documents before generating the authoritative register.

A Production Gate completion may trigger this read-only refresh when its conclusion is either `success` or `failure`. The gate conclusion itself grants no credit. Each document must independently satisfy:

1. canonical workflow and exact `main` SHA selection;
2. exact artifact name bound to the assessed SHA;
3. safe bounded ZIP extraction;
4. exact-SHA evidence binding;
5. no evidence explicitly marked as containing sensitive values;
6. the canonical validator for that evidence type.

Only documents satisfying every requirement are written to the workspace and become eligible for P0 evaluation. Missing, stale, malformed, ambiguous, sensitive or validator-failing documents remain absent/Open.

## Safety boundary

- Repository permissions remain `actions: read` and `contents: read`.
- No Production Gate workflow is dispatched by this fan-in.
- No database, provider, secret, branch protection, Stripe, Vercel, Sentry or production configuration is mutated.
- A failed Production Gate never becomes a PASS signal by itself.
- The authoritative P0 decision remains `NO_GO` while any required control is Open.
- The hydration manifest is retained inside the immutable P0 artifact so the source run and per-document validation outcome remain auditable.
