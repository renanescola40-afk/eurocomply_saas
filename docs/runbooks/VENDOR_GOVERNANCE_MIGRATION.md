# Vendor governance migration runbook

## Preconditions
- Confirm the deployment SHA and migration filename.
- Export counts grouped by `review_status`, `risk_level` and `data_access_level`.
- Identify rows with approved status but missing approver/timestamp, cross-tenant actors, or inconsistent review dates.
- Confirm the application release containing the updated server action is ready but not yet serving traffic.

## Deployment order
1. Apply `20260720044500_vendor_governance_integrity.sql` in a controlled environment.
2. Verify the history table, triggers, indexes, RLS policy and grants exist.
3. Exercise create, update, approval, stale-version conflict and delete using non-production fixtures.
4. Confirm direct authenticated PostgREST insert/update/delete is denied.
5. Deploy the application SHA that removes the legacy fallback.
6. Observe error rate and vendor mutation audit events.

## Verification queries
Use metadata-only checks. Do not copy vendor payloads into tickets or logs.
- Count vendors by organization and review status.
- Count history rows by operation.
- Confirm every newly approved row has `approved_at` and `approved_by`.
- Confirm review versions increase after updates.
- Confirm no authenticated role retains vendor DML grants.

## Rollback
1. Stop or roll back the application release before changing database permissions.
2. Preserve `vendor_review_history`; do not truncate or drop it.
3. Disable the integrity trigger only when a documented incident commander approves the temporary loss of enforcement.
4. Restore the previous manager policy only as an explicit emergency exception and record the duration.
5. Reconcile mutations performed during the exception before re-enabling controls.

## Blockers and evidence limits
Do not mark production validation complete without an applied migration identifier, exact deployment SHA, non-sensitive verification output and an accountable operator. This runbook is not evidence of a completed production deployment, disaster-recovery exercise, pentest, certification or external audit.
