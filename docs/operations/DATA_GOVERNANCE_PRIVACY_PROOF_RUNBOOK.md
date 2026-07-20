# Data governance privacy proof

## Required protected configuration

Environment: `production-data-governance-proof`

Secret:
- `RECOVERY_ISOLATED_DATABASE_URL`

Variables:
- `DATA_RESIDENCY_REGION` such as `eu-west-1`
- `DATA_RETENTION_DEFAULT_DAYS` between 1 and 3650
- `DATA_EXPORT_ENCRYPTION_REQUIRED=true`

## Procedure

1. Apply migrations to the isolated recovery database.
2. Confirm it contains no live customer traffic and is disposable.
3. Open Actions → Data Governance Privacy Audit Proof.
4. Enter exactly `EXECUTE_DATA_GOVERNANCE_PROOF`.
5. Approve the protected environment.
6. Review the evidence artifact and run the strict validator.

## What is checked

- retention-policy schema and bounded retention windows;
- data-subject request types, statuses and 30-day due default;
- tenant RLS on all governance tables;
- owner/admin processing boundaries;
- SHA-256 audit-integrity checkpoint constraints;
- declared residency region;
- mandatory encrypted export configuration;
- absence of customer rows and identifiers in evidence.

## Abort conditions

Abort when the database URL points to live production, migrations are not applied, residency is unknown, export encryption is disabled, RLS is missing, policies are incomplete or the target SHA differs from current `main`.

## Operational follow-up

A real request must still be verified, assigned, completed or rejected with a lawful reason. Never place raw exports in GitHub artifacts. Customer exports must use an authenticated, expiring and encrypted delivery channel with access logging.
