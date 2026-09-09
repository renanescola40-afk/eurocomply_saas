# Data governance privacy proof

## Required protected configuration

Environment: `production-data-governance-proof`

Secret:
- `RECOVERY_ISOLATED_DATABASE_URL`

Environment variable:
- `DATA_RESIDENCY_REGION` — must match the attributable Production data-hosting region; current Production Supabase project evidence reports `eu-west-1`.

Source-controlled proof policy:
- `DATA_RETENTION_POLICY_MODE=category_specific`
- `DATA_EXPORT_ENCRYPTION_REQUIRED=true`

RISCK COMPLY does not use one universal retention period for every data category. `DATA_RETENTION_DEFAULT_DAYS` is therefore not a valid proof input and must not be invented to make the workflow green. The proof validates the category-specific retention schema and its bounded `retention_days` contract instead.

`DATA_EXPORT_ENCRYPTION_REQUIRED=true` represents the product operating requirement that governed exports use an encrypted channel; it is not an external provider cryptographic certification.

## Procedure

1. Apply migrations to the isolated recovery database.
2. Confirm it contains no live customer traffic and is disposable.
3. Confirm `DATA_RESIDENCY_REGION` in the protected environment matches attributable Production provider evidence.
4. Open Actions → Data Governance Privacy Audit Proof.
5. Enter the exact current protected `main` SHA.
6. Enter exactly `EXECUTE_DATA_GOVERNANCE_PROOF`.
7. Approve the protected environment.
8. Review the evidence artifact and run the strict validator.

## What is checked

- category-specific retention-policy schema with a non-null integer `retention_days` field bounded to 1–3650 days;
- data-subject request lifecycle including calendar-month deadline authority rather than a fixed 30-day default;
- tenant RLS/FORCE RLS and browser mutation boundaries on governance tables;
- owner/admin/server processing boundaries;
- SHA-256 audit-integrity checkpoint constraints;
- declared residency region;
- mandatory encrypted export policy;
- absence of customer rows and identifiers in evidence.

## Abort conditions

Abort when the database URL points to live production, migrations are not applied, residency is unknown or not attributable, export encryption policy is disabled, retention is represented as a fabricated universal default, RLS is missing, policies are incomplete, or the target SHA differs from current protected `main`.

## Operational follow-up

A real request must still be verified, assigned, completed or rejected with a lawful reason. Category-specific retention periods still require applicable business/legal justification and enforcement in the relevant data lifecycle; passing this proof does not turn a schema bound into a universal legal retention conclusion. Never place raw exports in GitHub artifacts. Customer exports must use an authenticated, expiring and encrypted delivery channel with access logging.
