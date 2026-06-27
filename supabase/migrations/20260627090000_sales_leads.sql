-- Sales lead capture for the public Book demo page.
-- Public clients do not write directly to this table; /api/leads inserts with the service role.

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  work_email text not null,
  company_name text not null,
  role text,
  company_size text,
  region text,
  compliance_drivers text,
  timeline text,
  current_process text,
  message text,
  source text not null default 'book-demo',
  locale text,
  consent_to_contact boolean not null default false,
  user_agent text,
  ip_hint text,
  status text not null default 'new',
  notes text
);

alter table public.sales_leads enable row level security;

-- No public policies are created intentionally.
-- The Next.js lead API writes with the Supabase service role after server-side validation.

create index if not exists sales_leads_created_at_idx on public.sales_leads (created_at desc);
create index if not exists sales_leads_work_email_idx on public.sales_leads (lower(work_email));
create index if not exists sales_leads_status_idx on public.sales_leads (status);
