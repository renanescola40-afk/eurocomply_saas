# 2026-08-16 — Gap/remediation persistence forward reconciliation

## Status

Technical reconciliation prepared. Production promotion and migration-history approval remain separately gated.

## Baseline revalidated

- protected `main`: `60f99e270e5b1599078d965a0243f7d020973b32`
- production Supabase project: `eurocomply_saas`
- historical migration version `20260605`: not recorded in `supabase_migrations.schema_migrations`
- production `public.workspaces`: absent
- production `public.gap_assessments`: absent
- production `public.gap_answers`: absent
- production `public.compliance_findings`: absent
- production `public.evidence_items`: absent
- production `public.compliance_evidence`: absent
- production `compliance-evidence` storage bucket: absent
- production `public.compliance_tasks`: present through later canonical lineage

Read-only inspection also proved that the live `public.compliance_tasks` shape is organization-scoped and does not contain the compatibility columns used by the current Gap Analysis remediation client (`workspace_id`, `finding_id`, `user_id`, `owner_id`, `completed_at`, `metadata`). Existing live rows are organization-scoped; no row observed during the bounded count check had a null `organization_id`.

## Runtime dependency

Current application code still persists:

- Gap Analysis results into `gap_assessments` and `gap_answers`;
- generated remediation into `compliance_findings` and `compliance_tasks`;
- Evidence Vault records into `evidence_items`.

Both current Gap Analysis entry points pass `workspaceId: null` and bind persistence to the authenticated Supabase `user.id`. Therefore recreating the historical foreign-key dependency on `public.workspaces` would be incorrect for the current schema and would fail against production.

## Decision

Do **not** edit or mark the historical `20260605_*` files as applied.

Use the new forward-only migration:

`supabase/migrations/20260816104500_reconcile_gap_remediation_persistence.sql`

The migration:

1. materializes the missing Gap Analysis, findings and evidence tables;
2. extends, but does not replace, the canonical organization-scoped `compliance_tasks` table;
3. keeps organization task policies intact;
4. creates a separate personal-row RLS scope only when `organization_id is null` and `user_id = auth.uid()`;
5. validates child ownership for assessment, finding and task links;
6. enables and forces RLS on the reconciled public tables;
7. keeps `anon` without direct table access;
8. creates/forces the compliance-evidence storage bucket private and owner-prefix scoped;
9. fails closed if required tables, compatibility columns, RLS/FORCE RLS, or bucket privacy are missing;
10. never writes migration-history records and never invokes migration repair.

## Historical lineage handling

The five duplicate-version source files remain preserved byte-for-byte:

- `20260605_compliance_evidence.sql`
- `20260605_evidence_vault.sql`
- `20260605_findings_tasks.sql`
- `20260605_gap_analysis.sql`
- `20260605_gap_analysis_user_scoped_patch.sql`

They remain excluded from the disposable canonical-history simulation because they share an invalid duplicate version. Their required current schema effects are now represented by the forward migration above. This technical mapping is not independent human approval to alter production migration history.

## Safety boundary

This decision authorizes no destructive production SQL, no unrestricted `supabase db push`, no migration repair and no manual insertion into `supabase_migrations.schema_migrations`.

Production promotion remains subject to issue #1415 / #1631 controls: production-like rehearsal, bounded dry-run, backup/recovery readiness, independent approval, exact migration set, and post-deploy drift verification.
