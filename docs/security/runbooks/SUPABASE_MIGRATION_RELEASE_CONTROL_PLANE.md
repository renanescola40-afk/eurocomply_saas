# Supabase Migration Release Control Plane

## Purpose

Provide one fail-closed release control plane for the migration reconciliation lifecycle after human classification has been accepted.

This layer combines:

- bounded execution-plan validation;
- protected staging rehearsal;
- backup and PITR evidence;
- maintenance-window approval;
- separation of database operator and independent approver;
- rollback ownership;
- post-batch schema, migration-history, RLS and application-smoke controls;
- immutable post-execution attestation.

## Absolute safety boundary

No artifact or workflow in this control plane automatically executes production SQL.

The control-plane result always keeps:

- `productionWriteAuthorizedByThisArtifact: false`;
- `automaticExecutionAllowed: false`.

A separate protected manual production workflow, fresh environment approval and explicit human operation remain mandatory.

## Protected environments

Create and protect:

1. `supabase-staging-migration-rehearsal`
2. `supabase-production-release-approval`
3. a separate production-execution environment if a manual executor is later implemented

Require reviewers who are not the database operator for the production approval environment.

## Staging secrets

The staging rehearsal requires:

- `STAGING_DB_URL`
- `STAGING_PROJECT_REF`
- `PRODUCTION_PROJECT_REF`

The workflow fails if staging and production refs match or if the staging URL contains the production project ref.

## Required evidence flow

1. Run the exact-SHA production migration inventory workflow.
2. Capture read-only live-schema evidence.
3. Generate migration review dossiers.
4. Complete and seal human decisions.
5. Compile the bounded execution plan.
6. Run `Supabase Migration Staging Rehearsal`.
7. Complete RLS, authenticated smoke and rollback rehearsal evidence.
8. Change the rehearsal document to `PASSED` only after independent review.
9. Complete production authorization from the provided template.
10. Run `Supabase Migration Release Control Plane`.
11. Request a separate protected production execution only when the control-plane artifact is accepted.
12. After each production batch, stop on any failed schema, history, RLS, smoke or observability control.
13. Publish and validate the post-execution attestation.

## Production authorization requirements

The reviewed authorization must bind to:

- exact current `main` SHA;
- exact execution-plan digest;
- exact rehearsal digest;
- backup or PITR restore-point evidence;
- maintenance window;
- incident commander;
- database operator;
- independent approver;
- rollback owner;
- change-approval reference.

Operator and approver must be different people.

## Post-execution attestation

The attestation validator requires:

- exact control-plane digest;
- production workflow reference;
- migration history before and after;
- schema verification;
- live RLS tenant-isolation evidence;
- authenticated application smoke evidence;
- observability review;
- one result per deployment batch;
- rollback evidence whenever rollback was triggered.

Only an accepted post-execution result is eligible to credit the enterprise gate for completed production migration execution.

## Stop conditions

Stop immediately when:

- the current main SHA changed;
- any artifact digest differs;
- staging points to production;
- backup or PITR evidence is missing;
- operator and approver are the same person;
- a batch check fails;
- RLS tenant isolation fails;
- authenticated smoke fails;
- unexpected errors appear in observability;
- rollback cannot be executed or proven.

## Non-crediting rule

A dry-run alone is not production evidence. Object presence alone is not migration-history evidence. A successful SQL command alone is not release evidence. Enterprise credit requires the complete exact-SHA chain and accepted post-execution attestation.
