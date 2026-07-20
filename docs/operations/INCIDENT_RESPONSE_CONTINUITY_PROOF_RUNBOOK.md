# Incident Response and Continuity Proof Runbook

## Purpose
Validate the incident-response and continuity control plane without reading production incident or customer records.

## Protected environment
Create `production-incident-proof` with required reviewer approval.

Secret:
- `RECOVERY_ISOLATED_DATABASE_URL`

Variables:
- `INCIDENT_SEV1_ACK_TARGET_MINUTES` between 1 and 60;
- `INCIDENT_SEV1_CONTAINMENT_TARGET_MINUTES` between 5 and 240;
- `INCIDENT_TABLETOP_MAX_AGE_DAYS` between 1 and 365;
- `INCIDENT_ONCALL_ROTATION_CONFIGURED=true` only after the current rotation is independently reviewed;
- `INCIDENT_NOTIFICATION_MATRIX_REVIEWED=true` only after legal/security review of customer and regulator notification paths.

## Preconditions
1. Apply the migration to the isolated validation database.
2. Confirm the isolated database is not production.
3. Verify on-call ownership and escalation contacts.
4. Review notification decision criteria for privacy, security and availability events.
5. Record an approved tabletop or continuity exercise cadence.

## Execution
1. Open Actions → Incident Response and Continuity Proof.
2. Select `main`.
3. Enter `EXECUTE_INCIDENT_CONTINUITY_PROOF`.
4. Approve the protected environment.
5. Confirm exact-main verification, schema checks and evidence validation pass.
6. Retain the exact-SHA artifact for scorecard review.

## Abort conditions
Abort when the database is production, the SHA differs from current `main`, any variable was enabled without review, RLS is incomplete, or the artifact contains operational details.

## Acceptance boundary
A passing run proves schema and protected configuration presence. It does not prove successful handling of a real event, legal notification timeliness, customer communications, or achieved RPO/RTO in production.
