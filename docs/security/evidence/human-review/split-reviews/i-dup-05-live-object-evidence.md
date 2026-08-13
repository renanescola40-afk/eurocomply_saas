# I-DUP-05 live object evidence

Status: technical review evidence only.

Files in this duplicate-version group:

- `20260620120000_controlled_document_storage_read_lockdown.sql`
- `20260620120000_enterprise_multi_tenant_rls_final_lock.sql`

## Controlled document storage lockdown

Technical disposition candidate: `SUPERSEDED` by the unique forward reconciliation `20260813201500_reconcile_controlled_document_storage.sql` in this branch.

Current production inspection shows the `controlled-documents` bucket is absent and no matching storage-object policies are present. The duplicate-version lockdown file is not a safe standalone execution identity because it only updates an already-existing bucket and creates the read-deny policy; it does not materialize the bucket itself.

Repository migration `20260620090000_upload_malware_scan_hardening.sql` contains the broader intended contract: create/update the private bucket, constrain object-path organization prefixes, and deny direct authenticated reads/writes so trusted backend flows remain authoritative. The new unique forward reconciliation preserves that current contract without requiring execution of the ambiguous duplicate timestamp.

The forward migration is not represented here as already deployed.

## Enterprise multi-tenant RLS final lock

Technical disposition candidate: `SUPERSEDED` by the later private-helper/canonical-policy reconciliation chain plus `20260813201600_force_tasks_rls.sql` for the remaining live FORCE-RLS drift.

Current production metadata demonstrates that most of the historical migration's goals exist in stronger later form:

- tenant tables use `app_private.is_org_member(...)` / `app_private.has_org_role(...)` instead of the old public privileged helpers;
- browser mutation policies are narrowed or backend-only where required;
- organizations, organization_members, documents, risks, vendors, compliance_tasks, ai_systems, ai_incidents, audit_events, audit_logs, subscriptions, invitations, and notifications have RLS enabled, with FORCE RLS already active on the live tables inspected except `tasks`;
- later repository migrations `20260804230433_move_rls_helpers_to_private_schema.sql`, `20260807091341_reconcile_membership_rls_and_remove_permissive_bypasses.sql`, `20260809135000_enterprise_core_runtime_schema_reconciliation.sql`, and `20260812225906_consolidate_canonical_rls_and_client_grants.sql` encode the evolved policy authority.

Live `tasks` retains tenant-scoped policies but reports FORCE RLS=false. The unique forward migration `20260813201600_force_tasks_rls.sql` closes only that remaining schema-level drift and does not replace or rewrite task policies.

## Boundary

This file records technical evidence only. It does not state that either new forward migration has been deployed, execute SQL, alter migration history, record independent approval, or authorize a database change.

- `productionWriteAuthorized = false`
- `migrationExecutionAuthorized = false`
- `independentApprovalPresent = false`
- `canonicalDecisionAccepted = false`
