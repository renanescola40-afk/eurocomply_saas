-- Forward reconciliation applied to production on 2026-09-22.
-- Restores transactional email delivery audit storage with a backend-only RLS boundary.

create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  recipient_hash text not null,
  template text not null check (
    template in (
      'welcome_onboarding',
      'organization_created',
      'member_invited',
      'billing_started',
      'invoice_failed',
      'compliance_deadline_reminder',
      'export_ready',
      'security_alert',
      'trial_upgrade',
      'document_expiring',
      'vendor_review'
    )
  ),
  status text not null check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider text not null default 'resend' check (provider in ('resend', 'console')),
  provider_id text,
  attempts integer not null default 0 check (attempts >= 0),
  subject text,
  organization_id uuid references public.organizations(id) on delete set null,
  user_id text,
  idempotency_key text unique,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists email_delivery_logs_recipient_hash_idx
  on public.email_delivery_logs(recipient_hash);

create index if not exists email_delivery_logs_template_status_idx
  on public.email_delivery_logs(template, status, created_at desc);

create index if not exists email_delivery_logs_organization_idx
  on public.email_delivery_logs(organization_id, created_at desc);

alter table public.email_delivery_logs enable row level security;
alter table public.email_delivery_logs force row level security;

revoke all on table public.email_delivery_logs from public, anon, authenticated;
grant select, insert, update, delete on table public.email_delivery_logs to service_role;

drop policy if exists "email delivery logs service role select" on public.email_delivery_logs;
drop policy if exists "email delivery logs service role insert" on public.email_delivery_logs;
drop policy if exists "email delivery logs service role update" on public.email_delivery_logs;
drop policy if exists "email delivery logs service role delete" on public.email_delivery_logs;

create policy "email delivery logs service role select"
  on public.email_delivery_logs for select to service_role using (current_user = 'service_role');

create policy "email delivery logs service role insert"
  on public.email_delivery_logs for insert to service_role with check (current_user = 'service_role');

create policy "email delivery logs service role update"
  on public.email_delivery_logs for update to service_role using (current_user = 'service_role') with check (current_user = 'service_role');

create policy "email delivery logs service role delete"
  on public.email_delivery_logs for delete to service_role using (current_user = 'service_role');

comment on table public.email_delivery_logs is
  'Server-side transactional email send log. Email bodies and secrets are intentionally not stored.';
