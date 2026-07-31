# Supabase production change request checklist

This checklist may be used only after a successful exact-SHA staging rehearsal attestation.

- [ ] Exact release SHA identified.
- [ ] Reconciliation artifact accepted for the same SHA.
- [ ] Staging rehearsal status is `STAGING_REHEARSAL_PASSED`.
- [ ] Production backup/PITR is confirmed and timestamped.
- [ ] Maintenance window is approved.
- [ ] Operator, approver, incident commander and rollback owner are named.
- [ ] History repair and SQL deployment remain separate operations.
- [ ] Every production batch contains at most 10 migrations.
- [ ] Every migration digest matches the accepted reconciliation.
- [ ] Rollback procedure exists for every batch.
- [ ] Post-batch migration-history, schema, RLS and authenticated smoke checks are ready.
- [ ] Observability and alerting are active during the window.
- [ ] Customer communication decision is documented.
- [ ] Stop criteria and rollback triggers are documented.
- [ ] No unresolved split-review item exists.
- [ ] Independent production approval is recorded.

Completion of this checklist is coordination evidence only. It does not execute or authorize a production write by itself.
