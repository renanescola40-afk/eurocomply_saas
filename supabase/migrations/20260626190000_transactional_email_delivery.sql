-- Transactional email delivery logs for Resend.
-- Run after the core organizations/users tables exist.

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

-- Service role owns all access through the server-side email client.
-- Users should not be able to read or mutate delivery logs by default.
drop policy if exists "email delivery logs are service role only" on public.email_delivery_logs;
drop policy if exists "email delivery logs select service role" on public.email_delivery_logs;
drop policy if exists "email delivery logs insert service role" on public.email_delivery_logs;
drop policy if exists "email delivery logs update service role" on public.email_delivery_logs;
drop policy if exists "email delivery logs delete service role" on public.email_delivery_logs;

create policy "email delivery logs select service role"
  on public.email_delivery_logs
  for select
  using (auth.role() = 'service_role');

create policy "email delivery logs insert service role"
  on public.email_delivery_logs
  for insert
  with check (auth.role() = 'service_role');

create policy "email delivery logs update service role"
  on public.email_delivery_logs
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "email delivery logs delete service role"
  on public.email_delivery_logs
  for delete
  using (auth.role() = 'service_role');

comment on table public.email_delivery_logs is 'Server-side transactional email send log. Stores recipient and recipient_hash, template, status, provider id, retry attempts and sanitized errors only. Email bodies and secrets are intentionally not stored.';
comment on column public.email_delivery_logs.recipient is 'Primary recipient email address for operational support and acceptance evidence.';
comment on column public.email_delivery_logs.recipient_hash is 'SHA-256 hash used for search/analytics without exposing raw email in dashboards.';
comment on column public.email_delivery_logs.provider_id is 'Resend email id returned by the provider.';
comment on column public.email_delivery_logs.error is 'Sanitized provider/application error. Must not contain provider secrets, bearer values, invite values, OTPs or private credentials.';
