-- Dashboard performance indexes for enterprise production readiness.
-- Keep these indexes tenant-first so every critical dashboard lookup remains organization scoped.

create index if not exists idx_organization_members_user_created
  on public.organization_members (user_id, created_at, organization_id);

create index if not exists idx_compliance_tasks_org_status_due
  on public.compliance_tasks (organization_id, status, due_date);

create index if not exists idx_risks_org_status_score
  on public.risks (organization_id, status, risk_score desc);

create index if not exists idx_vendors_org_review_risk_updated
  on public.vendors (organization_id, review_status, risk_level, updated_at);

create index if not exists idx_documents_org_status_expires
  on public.documents (organization_id, status, expires_at);

create index if not exists idx_compliance_metric_snapshots_org_created
  on public.compliance_metric_snapshots (organization_id, created_at desc);
