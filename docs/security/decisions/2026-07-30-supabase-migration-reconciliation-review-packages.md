# ADR — Supabase Migration Reconciliation Review Packages

- **Date:** 2026-07-30
- **Status:** Accepted
- **Decision owner:** Database Reliability / Security Engineering
- **Related issue:** #1415

## Context

The exact-branch migration audit can produce hundreds of SQL files requiring human classification because they are local-only, use invalid legacy timestamps, or share duplicate migration versions.

A single inventory is necessary for integrity, but it is not an ergonomic review unit. Manually copying files into spreadsheets or ad-hoc documents would lose SHA-256 binding, create inconsistent evidence fields, and increase the chance of treating preparation as an accepted migration decision.

The production dry-run workflow is expected to remain blocked while this reconciliation work exists. A blocked run should still provide useful, immutable review material rather than terminating before reviewers receive the inventory.

## Decision

Generate bounded, non-crediting reconciliation review packages from the exact inventory produced by the migration drift audit.

`scripts/supabase/generate-migration-reconciliation-review-packages.mjs`:

- accepts the immutable reconciliation inventory JSON;
- verifies the inventory schema;
- rejects invalid SHA-256 values;
- rejects items without classification reasons;
- rejects any inventory containing a pre-filled classification, reviewer, or rationale;
- sorts items deterministically by version, filename, and digest;
- splits them into bounded batches of 1–100 items, defaulting to 25;
- binds every package to the SHA-256 digest of the complete source inventory;
- creates paired JSON and Markdown packages plus an index;
- fixes package status to `HUMAN_REVIEW_REQUIRED`;
- fixes accepted decisions to zero;
- leaves every decision field null.

Each review item contains:

- version and filename;
- SQL SHA-256 and byte length;
- duplicate indicator and classification reasons;
- allowed classification vocabulary;
- empty rationale, evidence, reviewer, order, rollback, staged-execution, and decision-digest fields.

## Workflow behavior

The production migration dry-run workflow now retains the strict audit exit code instead of failing immediately.

The order is:

1. capture exact remote migration state;
2. run audit and generator contract tests;
3. run the strict deployability audit and retain exit code 0, 2, or 3;
4. require the reconciliation inventory artifact;
5. generate review packages even when deployability is blocked;
6. enforce the retained audit exit code;
7. execute `supabase db push --dry-run` only when the retained code is zero;
8. upload audit, inventory, review packages, and any dry-run output.

This preserves fail-closed behavior while making blocked runs actionable.

## Review evidence requirements

Generated packages explain the minimum evidence required for each classification:

- `ALREADY_PRESENT_IN_SCHEMA`: object-level target-schema evidence and SQL mapping;
- `PENDING_DEPLOYMENT`: staged execution, order, backup, and rollback evidence;
- `SUPERSEDED`: replacement migration digest and coverage proof;
- `ARCHIVE_LEGACY`: explicit non-execution and archival mapping;
- `REQUIRES_SPLIT_REVIEW`: scoped follow-up identifying unresolved objects/statements.

`supabase migration repair --status applied` remains prohibited unless the exact schema change is demonstrably present in the target database.

## Safety boundaries

Package generation does not:

- classify a migration;
- inspect or conclude the target schema state;
- approve deploy order;
- approve rollback readiness;
- update migration history;
- execute SQL;
- authorize dry-run or production write;
- close issue #1415.

Generated files are workflow artifacts only. Accepted classifications require a separate reviewed evidence path and validator.

## Consequences

### Positive

- Every review unit remains bound to the exact inventory digest.
- Hundreds of files become manageable review batches without losing integrity.
- Blocked dry-run workflows still return useful artifacts.
- Pre-filled or AI-inferred human decisions fail package generation.
- Reviewers receive consistent evidence fields and classification guidance.

### Trade-offs

- Human classification and target-schema evidence remain substantial work.
- Package artifacts must be regenerated whenever the exact final SHA or inventory changes.
- This layer prepares review but deliberately does not credit completion.

## Exit criteria

This preparation layer is complete when:

- packages generate successfully for the exact final inventory;
- all source items are covered exactly once;
- every package is digest-bound and non-crediting;
- the production dry-run remains blocked until accepted reconciliation decisions are independently validated.
