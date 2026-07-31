# Supabase Migration Execution Plan

## Purpose

Compile an accepted, sealed migration reconciliation decision set into bounded execution batches without executing SQL or changing migration history.

## Inputs

The workflow consumes the successful exact-SHA artifact from **Supabase Migration Reconciliation Decision Gate**:

- `decision-result.json`;
- `pending-deployment-plan.json`;
- `migration-history-repair-candidates.json`.

The decision result must be `RECONCILIATION_ACCEPTED`. Missing staging or rollback evidence, duplicate deployment order, digest mismatch, wrong SHA, or an unaccepted decision set fails closed.

## Output

`execution-plan.json` contains:

- ordered batches of at most 1–25 migrations;
- exact migration filename, digest, version and reviewed order;
- staging and rollback references per migration;
- history-repair candidates kept separate from deployment batches;
- mandatory batch preconditions and postconditions;
- global backup/PITR, staging clone, maintenance window, operator, approver and dry-run placeholders.

Every batch is emitted with `executionAuthorized: false`. The global safety boundary fixes dry-run and production-write authorization to `false`.

## Required evidence before a later execution workflow may exist

For the exact release SHA:

1. Fresh backup or PITR evidence.
2. Production-like staging clone validation.
3. Successful exact-plan dry-run.
4. Approved maintenance window.
5. Named database operator.
6. Independent approver who did not perform the migration classifications.
7. Tested rollback reference for every pending migration.
8. Post-batch schema, migration-history, RLS and application-smoke checks.

## Separation of duties

- `ALREADY_PRESENT_IN_SCHEMA` items are only history-repair candidates and must never be mixed into SQL deployment batches.
- `PENDING_DEPLOYMENT` items are ordered and batched but remain non-authorized.
- `SUPERSEDED` and `ARCHIVE_LEGACY` items are excluded from execution.
- No unrestricted `supabase db push` is allowed while issue #1415 remains open.

## Safety boundary

This workflow does not connect to Supabase, execute SQL, run migration repair, authorize a dry-run, authorize production, or close issue #1415. It produces a reviewable plan only.
