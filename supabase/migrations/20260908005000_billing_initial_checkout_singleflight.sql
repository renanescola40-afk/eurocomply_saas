begin;

create table if not exists public.billing_checkout_attempts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null check (plan in ('starter','professional')),
  attempt_token uuid not null,
  status text not null check (status in ('claimed','open')),
  stripe_session_id text,
  lease_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'claimed' and stripe_session_id is null) or (status = 'open' and stripe_session_id is not null))
);

create unique index if not exists billing_checkout_attempts_session_unique
  on public.billing_checkout_attempts(stripe_session_id)
  where stripe_session_id is not null;

alter table public.billing_checkout_attempts enable row level security;
alter table public.billing_checkout_attempts force row level security;
revoke all on table public.billing_checkout_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_checkout_attempts to service_role;

create or replace function public.claim_initial_billing_checkout_atomic(
  p_organization_id uuid,
  p_plan text,
  p_attempt_token uuid,
  p_claim_expires_at timestamptz
)
returns table(
  outcome text,
  attempt_token uuid,
  plan text,
  stripe_session_id text,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.billing_checkout_attempts%rowtype;
  v_plan text := lower(trim(coalesce(p_plan, '')));
begin
  if p_organization_id is null
     or p_attempt_token is null
     or v_plan not in ('starter','professional')
     or p_claim_expires_at is null
     or p_claim_expires_at <= now()
     or p_claim_expires_at > now() + interval '5 minutes' then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text, null::timestamptz;
    return;
  end if;

  -- One initial subscription creation lane per tenant, independent from browser
  -- tabs and client-provided idempotency keys.
  perform pg_advisory_xact_lock(hashtext('billing-checkout:' || p_organization_id::text));

  select attempt.* into v_existing
  from public.billing_checkout_attempts attempt
  where attempt.organization_id = p_organization_id;

  if found and v_existing.lease_expires_at > now() then
    return query select
      case when v_existing.plan = v_plan then 'existing' else 'busy' end::text,
      v_existing.attempt_token,
      v_existing.plan,
      v_existing.stripe_session_id,
      v_existing.lease_expires_at;
    return;
  end if;

  insert into public.billing_checkout_attempts(
    organization_id, plan, attempt_token, status, stripe_session_id,
    lease_expires_at, created_at, updated_at
  ) values (
    p_organization_id, v_plan, p_attempt_token, 'claimed', null,
    p_claim_expires_at, now(), now()
  )
  on conflict (organization_id) do update set
    plan = excluded.plan,
    attempt_token = excluded.attempt_token,
    status = 'claimed',
    stripe_session_id = null,
    lease_expires_at = excluded.lease_expires_at,
    updated_at = now()
  returning * into v_existing;

  return query select 'claimed'::text, v_existing.attempt_token, v_existing.plan,
    v_existing.stripe_session_id, v_existing.lease_expires_at;
end;
$$;

create or replace function public.bind_initial_billing_checkout_session_atomic(
  p_organization_id uuid,
  p_attempt_token uuid,
  p_stripe_session_id text,
  p_session_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id text := trim(coalesce(p_stripe_session_id, ''));
begin
  if p_organization_id is null
     or p_attempt_token is null
     or v_session_id !~ '^cs_[A-Za-z0-9_]+$'
     or p_session_expires_at is null
     or p_session_expires_at <= now()
     or p_session_expires_at > now() + interval '25 hours' then
    return false;
  end if;

  update public.billing_checkout_attempts attempt
  set status = 'open',
      stripe_session_id = v_session_id,
      lease_expires_at = p_session_expires_at,
      updated_at = now()
  where attempt.organization_id = p_organization_id
    and attempt.attempt_token = p_attempt_token
    and attempt.status = 'claimed'
    and attempt.lease_expires_at > now();

  return found;
end;
$$;

create or replace function public.release_initial_billing_checkout_atomic(
  p_organization_id uuid,
  p_attempt_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_organization_id is null or p_attempt_token is null then
    return false;
  end if;

  delete from public.billing_checkout_attempts attempt
  where attempt.organization_id = p_organization_id
    and attempt.attempt_token = p_attempt_token;

  return found;
end;
$$;

create or replace function public.clear_initial_billing_checkout_by_session_atomic(
  p_stripe_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id text := trim(coalesce(p_stripe_session_id, ''));
begin
  if v_session_id !~ '^cs_[A-Za-z0-9_]+$' then
    return false;
  end if;

  delete from public.billing_checkout_attempts attempt
  where attempt.stripe_session_id = v_session_id;

  return found;
end;
$$;

revoke all on function public.claim_initial_billing_checkout_atomic(uuid,text,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.bind_initial_billing_checkout_session_atomic(uuid,uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.release_initial_billing_checkout_atomic(uuid,uuid) from public, anon, authenticated;
revoke all on function public.clear_initial_billing_checkout_by_session_atomic(text) from public, anon, authenticated;
grant execute on function public.claim_initial_billing_checkout_atomic(uuid,text,uuid,timestamptz) to service_role;
grant execute on function public.bind_initial_billing_checkout_session_atomic(uuid,uuid,text,timestamptz) to service_role;
grant execute on function public.release_initial_billing_checkout_atomic(uuid,uuid) to service_role;
grant execute on function public.clear_initial_billing_checkout_by_session_atomic(text) to service_role;

comment on table public.billing_checkout_attempts is
  'Backend-only single-flight lease preventing concurrent initial Stripe subscription Checkout sessions for one organization.';

notify pgrst, 'reload schema';
commit;
