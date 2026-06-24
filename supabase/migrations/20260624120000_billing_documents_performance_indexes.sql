-- Billing and documents performance indexes for tenant-scoped production reads.
-- Keep organization_id first for private tenant data and common count/list paths.

create index if not exists idx_documents_org_created
  on public.documents (organization_id, created_at desc);

create index if not exists idx_organization_members_org_created
  on public.organization_members (organization_id, created_at);

create index if not exists idx_subscriptions_org
  on public.subscriptions (organization_id);
