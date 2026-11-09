-- Isolated QA ONLY; requires approved synthetic fixture and the scoped helper migration.
-- The signed-contract fixture is always rolled back: NO customer, email, Stripe or production writes.
begin;
set local lock_timeout = '750ms';
set local statement_timeout = '20s';
do $qa_fixture$
declare target_org uuid; foreign_org uuid; owner_sub text; source_id uuid;
begin
  if (select count(*) from public.organizations)<>2
    or (select count(*) from auth.users)<>5
    or (select count(*) from public.organization_members
        where clerk_user_id like 'qa-%' and user_id is null and status='active')<>5
    or (select count(*) from public.organization_security_settings
        where require_mfa_for_all_users)<>2
    or (select count(*) from public.enterprise_entitlement_sources where active)<>0
    or (select count(*) from public.enterprise_entitlement_snapshots where status='applied')<>0
  then raise exception 'QA caller-scope smoke refused: wrong synthetic fixture'; end if;

  select organization_id,clerk_user_id into target_org,owner_sub
  from public.organization_members
  where clerk_user_id like 'qa-%' and role='owner' and status='active'
  order by organization_id,id limit 1;
  select id into foreign_org from public.organizations where id<>target_org limit 1;
  if target_org is null or foreign_org is null or owner_sub is null
    then raise exception 'QA smoke owner/tenant missing'; end if;

  insert into public.enterprise_entitlement_sources
    (organization_id,source_kind,external_reference,priority,active,version,effective_from)
  values
    (target_org,'signed_contract','qa-rollback-only-sec04-scope',900,true,1,now()-interval '3 minutes')
  returning id into source_id;
  insert into public.enterprise_entitlement_snapshots
    (organization_id,source_id,idempotency_key,source_version,plan_code,
    full_seat_limit,participant_seat_limit,viewer_seat_limit,entitlements,
    source_payload_sha256,observed_at,valid_from,status,applied_policy_version)
  values
    (target_org,source_id,'qa-sec04-scope-rollback-v1',1,'business',
    1,1,1,'{"purpose":"qa-sec04-rollback-only"}'::jsonb,repeat('a',64),
    now()-interval '1 minute',now()-interval '3 minutes','applied',1);

  perform set_config('qa.sec04_target',target_org::text,true);
  perform set_config('qa.sec04_foreign',foreign_org::text,true);
  perform set_config('qa.sec04_owner_sub',owner_sub,true);
end $qa_fixture$;
set local role authenticated;
do $qa_authenticated$
declare target_org uuid:=current_setting('qa.sec04_target')::uuid;
 foreign_org uuid:=current_setting('qa.sec04_foreign')::uuid;
 owner_sub text:=current_setting('qa.sec04_owner_sub');
begin
 if current_setting('role',true)<>'authenticated' then
   raise exception 'SEC-04 authenticated role not assumed'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
 perform set_config('request.jwt.claims',
   '{"sub":"00000000-0000-4000-8000-000000000000","role":"authenticated","aal":"aal2"}',true);
 if app_private.is_org_member(target_org) is distinct from false
   or app_private.has_commercial_authority(target_org) is distinct from false
   or app_private.has_minimum_commercial_plan(target_org,'business') is distinct from false
 then raise exception 'SEC-04 outsider inferred another tenant license'; end if;

 perform set_config('request.jwt.claim.sub',owner_sub,true);
 perform set_config('request.jwt.claims',
    jsonb_build_object('sub',owner_sub,'role','authenticated','aal','aal2')::text,true);
 if app_private.is_org_member(target_org) is distinct from true
   or app_private.has_commercial_authority(target_org) is distinct from true
   or app_private.has_minimum_commercial_plan(target_org,'business') is distinct from true
   or app_private.has_commercial_authority(foreign_org) is distinct from false
 then raise exception 'SEC-04 licensed tenant positive or cross-tenant isolation failed'; end if;

 perform set_config('request.jwt.claims',
    jsonb_build_object('sub',owner_sub,'role','authenticated','aal','aal1')::text,true);
 if app_private.has_commercial_authority(target_org) is distinct from false
   or app_private.has_minimum_commercial_plan(target_org,'business') is distinct from false
 then raise exception 'SEC-04 AAL1 MFA bypass'; end if;
end $qa_authenticated$;
reset role;
set local role service_role;
do $qa_backend$
declare target_org uuid:=current_setting('qa.sec04_target')::uuid;
begin
 if current_setting('role',true)<>'service_role'
   or app_private.has_commercial_authority(target_org) is distinct from true
   or app_private.has_minimum_commercial_plan(target_org,'business') is distinct from true
 then raise exception 'SEC-04 backend service_role entitlement regression'; end if;
end $qa_backend$;
reset role;
rollback;
select 'QA_SEC04_COMMERCIAL_CALLER_SCOPE_ROLLBACK_PASS'::text as result;
