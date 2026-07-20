# Procurement & Trust Operations Proof Runbook

## Purpose
Validate procurement, vendor due-diligence and trust-evidence controls on the exact merged `main` SHA without reading customer or vendor content.

## Protected configuration
Environment: `production-procurement-trust-proof`

Secret:
- `RECOVERY_ISOLATED_DATABASE_URL`
- `TRUST_CENTER_PUBLIC_URL`

Variables:
- `TRUST_PACKAGE_ENCRYPTION_REQUIRED=true`
- `PROCUREMENT_SLA_DAYS` between 1 and 30
- `SUBPROCESSOR_REGISTER_REVIEWED=true`

## Preconditions
1. The migration is applied to the isolated recovery database.
2. The branch is merged to `main`.
3. An independent reviewer has approved the configuration values.
4. The public Trust Center URL uses HTTPS and exposes only approved public material.

## Execution
Run `Procurement Trust Operations Proof` manually and type:

`EXECUTE_PROCUREMENT_TRUST_PROOF`

## Acceptance
- exact `main` SHA is recorded;
- three governance tables exist;
- RLS is enabled on all three tables;
- complete CRUD policy coverage is present;
- trust package SHA-256 constraint exists;
- procurement SLA is bounded;
- encrypted evidence packages are required;
- subprocessor register is independently reviewed;
- public Trust Center uses HTTPS;
- evidence validator passes.

## Abort conditions
Abort when the isolated database URL points to production, any expected policy is missing, encryption is not mandatory, the Trust Center is not HTTPS, or evidence contains sensitive material.

## Evidence handling
Only the canonical JSON artifact may be retained. Do not upload database dumps, questionnaire answers, vendor names, DPA files, evidence packages, tokens or connection strings.
