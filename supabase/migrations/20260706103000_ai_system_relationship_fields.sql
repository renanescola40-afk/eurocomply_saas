-- Explicit AI system relationship fields.
-- Additive only: no destructive changes and no assumptions about optional module tables.

alter table if exists public.ai_systems
  add column if not exists primary_vendor_id uuid,
  add column if not exists primary_document_id uuid,
  add column if not exists primary_task_id uuid,
  add column if not exists primary_risk_id uuid;

alter table if exists public.compliance_tasks
  add column if not exists ai_system_id uuid;

alter table if exists public.documents
  add column if not exists ai_system_id uuid;

alter table if exists public.compliance_documents
  add column if not exists ai_system_id uuid;

alter table if exists public.vendors
  add column if not exists ai_system_id uuid;

alter table if exists public.risks
  add column if not exists ai_system_id uuid;

alter table if exists public.risk_register
  add column if not exists ai_system_id uuid;

create index if not exists ai_systems_primary_vendor_idx
  on public.ai_systems(organization_id, primary_vendor_id);

create index if not exists ai_systems_primary_document_idx
  on public.ai_systems(organization_id, primary_document_id);

create index if not exists ai_systems_primary_task_idx
  on public.ai_systems(organization_id, primary_task_id);

create index if not exists ai_systems_primary_risk_idx
  on public.ai_systems(organization_id, primary_risk_id);

create index if not exists compliance_tasks_ai_system_idx
  on public.compliance_tasks(organization_id, ai_system_id);
