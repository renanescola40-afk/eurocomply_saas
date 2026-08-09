# Supabase production change request checklist

Use this checklist only after a successful staging rehearsal attestation for the immutable subject release SHA.

- [ ] Subject release SHA identified and unchanged.
- [ ] Current evidence commit is a descendant containing only canonical migration evidence files.
- [ ] Human migration classifications were accepted for the subject SHA.
- [ ] Execution plan was compiled from the accepted classification artifact.
- [ ] Staging rehearsal status is `STAGING_REHEARSAL_PASSED`.
- [ ] Staging attestation includes the exact staged filename/SHA-256 set.
- [ ] Production request rehearsal digest matches the exact staging attestation JSON.
- [ ] Every production migration filename and SHA-256 exactly matches the staged set.
- [ ] No staged migration is omitted from the request.
- [ ] Production backup/PITR evidence is confirmed and timestamped.
- [ ] Restore test passed and RPO/RTO are recorded.
- [ ] Maintenance window is approved, in the future and at most four hours.
- [ ] Operator, approver, Incident Commander and rollback owner are named.
- [ ] Operator and approver are different people.
- [ ] Independent approval has timestamp, evidence reference and valid expiry.
- [ ] History repair and SQL deployment remain separate operations.
- [ ] Every production batch contains at most 10 migrations.
- [ ] Rollback procedure and decision threshold exist for every batch/change.
- [ ] Migration-history, schema, cross-tenant RLS, authenticated smoke and observability checks are ready.
- [ ] Customer communication decision is documented when applicable.
- [ ] Stop criteria and rollback triggers are documented.
- [ ] No unresolved split-review item exists.

Completion of this checklist is coordination evidence only. It does not execute a production write. Only a successful `Supabase Bounded Production Change` artifact can permit the named operator to request protected execution of the exact staged set during the approved window.
