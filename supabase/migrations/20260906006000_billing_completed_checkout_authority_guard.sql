begin;

-- Post-merge P0 revenue-protection hotfix.
--
-- The initial Checkout single-flight introduced in 20260906005000 used the
-- Stripe Checkout session expiry as the DB lease expiry. That is safe for an
-- abandoned OPEN session, but unsafe once Stripe marks the session COMPLETE:
-- the customer may already have created a subscription while the signed
-- customer.subscription.created/updated webhook is still delayed. If the DB
-- row ages out by wall clock during that gap, a second tab/request can create a
-- second subscription. Bound Checkout sessions must therefore remain durable
-- until Stripe itself proves the session expired/missing, or until processed
-- LIVE subscription authority reaches our ledger.

do $prerequisites$
begin
  if to_regclass('public.billing_checkout_attempts') is null
     or to_regclass('public.stripe_events_processed') is null
     or to_regprocedure('public.claim_initial_billing_checkout_atomic(uuid,text,uuid,timestamptz)') is null then
    raise exception 'billing completed-checkout authority prerequisites are missing';
  end if;
end
$prerequisites$;

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

  perform pg_advisory_xact_lock(hashtext('billing-checkout:' || p_organization_id::text));

  select attempt.* into v_existing
  from public.billing_checkout_attempts attempt
  where attempt.organization_id = p_organization_id;

  -- `claimed` is a short worker lease. `open` means a Stripe Checkout session
  -- has already been bound and is a durable commercial single-flight guard.
  -- Never age a bound session out merely because its original expires_at passed;
  -- the application must first retrieve Stripe and prove it is expired/missing.
  if found and (v_existing.status = 'open' or v_existing.lease_expires_at > now()) then
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

revoke all on function public.claim_initial_billing_checkout_atomic(uuid,text,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.claim_initial_billing_checkout_atomic(uuid,text,uuid,timestamptz) to service_role;

-- checkout.session.completed is deliberately NOT a release event. It can arrive
-- before the subscription event that becomes our commercial authority. Delete the
-- single-flight row only after a LIVE subscription created/updated event is marked
-- processed by the existing recovery/ledger pipeline.
create or replace function public.clear_initial_checkout_after_live_subscription_processed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'processed'
     and new.livemode is true
     and new.organization_id is not null
     and new.type in ('customer.subscription.created','customer.subscription.updated') then
    delete from public.billing_checkout_attempts attempt
    where attempt.organization_id = new.organization_id;
  end if;

  return new;
end;
$$;

revoke all on function public.clear_initial_checkout_after_live_subscription_processed() from public, anon, authenticated;

drop trigger if exists clear_initial_checkout_after_live_subscription_processed on public.stripe_events_processed;
create trigger clear_initial_checkout_after_live_subscription_processed
after insert or update on public.stripe_events_processed
for each row
execute function public.clear_initial_checkout_after_live_subscription_processed();

-- Reconcile attempts that were created before this forward hotfix but whose
-- authoritative LIVE subscription event has already been successfully processed.
delete from public.billing_checkout_attempts attempt
where exists (
  select 1
  from public.stripe_events_processed event
  where event.organization_id = attempt.organization_id
    and event.status = 'processed'
    and event.livemode is true
    and event.type in ('customer.subscription.created','customer.subscription.updated')
);

comment on function public.claim_initial_billing_checkout_atomic(uuid,text,uuid,timestamptz) is
  'Claims one tenant initial Checkout lane; bound Stripe sessions remain durable until provider expiry/missing proof or processed LIVE subscription authority.';
comment on function public.clear_initial_checkout_after_live_subscription_processed() is
  'Releases initial Checkout single-flight only after processed LIVE customer.subscription.created/updated authority; checkout.session.completed alone is insufficient.';

do $verify$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.stripe_events_processed'::regclass
      and tgname = 'clear_initial_checkout_after_live_subscription_processed'
      and not tgisinternal
  ) then
    raise exception 'completed-checkout live subscription release trigger is missing';
  end if;

  if has_function_privilege('anon', 'public.clear_initial_checkout_after_live_subscription_processed()'::regprocedure, 'EXECUTE')
     or has_function_privilege('authenticated', 'public.clear_initial_checkout_after_live_subscription_processed()'::regprocedure, 'EXECUTE') then
    raise exception 'completed-checkout release trigger function is browser executable';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
