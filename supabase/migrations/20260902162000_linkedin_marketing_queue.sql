begin;

create table if not exists public.linkedin_marketing_posts (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  status text not null default 'draft',
  scheduled_for timestamptz,
  claimed_at timestamptz,
  published_at timestamptz,
  linkedin_post_id text,
  attempt_count integer not null default 0,
  last_error_code text,
  idempotency_key text not null,
  autonomy_policy_version text not null default 'linkedin_marketing_operator_v1',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint linkedin_marketing_posts_body_length
    check (char_length(btrim(body)) between 1 and 3000),
  constraint linkedin_marketing_posts_status
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'needs_review', 'cancelled')),
  constraint linkedin_marketing_posts_schedule_required
    check (status <> 'scheduled' or scheduled_for is not null),
  constraint linkedin_marketing_posts_attempt_count
    check (attempt_count >= 0),
  constraint linkedin_marketing_posts_idempotency_key_unique
    unique (idempotency_key)
);

comment on table public.linkedin_marketing_posts is
  'Platform-owned LinkedIn editorial queue. Browser roles receive no direct access; server workers operate through service_role.';

create index if not exists linkedin_marketing_posts_due_idx
  on public.linkedin_marketing_posts (scheduled_for, id)
  where status = 'scheduled';

alter table public.linkedin_marketing_posts enable row level security;
revoke all on table public.linkedin_marketing_posts from public, anon, authenticated;
grant select, insert, update, delete on table public.linkedin_marketing_posts to service_role;

create or replace function public.claim_linkedin_marketing_posts(p_limit integer default 3)
returns setof public.linkedin_marketing_posts
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  with due as (
    select p.id
    from public.linkedin_marketing_posts p
    where p.status = 'scheduled'
      and p.scheduled_for <= now()
    order by p.scheduled_for asc, p.id asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 3), 10))
  )
  update public.linkedin_marketing_posts p
  set status = 'publishing',
      claimed_at = now(),
      attempt_count = p.attempt_count + 1,
      updated_at = now()
  from due
  where p.id = due.id
  returning p.*;
end;
$$;

revoke all on function public.claim_linkedin_marketing_posts(integer) from public, anon, authenticated;
grant execute on function public.claim_linkedin_marketing_posts(integer) to service_role;

commit;
