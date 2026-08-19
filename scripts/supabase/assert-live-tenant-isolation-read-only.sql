\set ON_ERROR_STOP on
\set QUIET 1

-- Runtime proof only. This transaction is explicitly READ ONLY, uses two
-- already-existing authenticated actors from different organizations, and
-- retains no user IDs, organization IDs or row data in evidence artifacts.
begin transaction read only;

select case when current_setting('transaction_read_only') = 'on' then 'true' else 'false' end
  as proof_transaction_read_only
\gset
\if :proof_transaction_read_only
\else
  \echo 'live tenant proof refused: transaction is not read-only'
  \quit 20
\endif

select case when pg_has_role(current_user, 'authenticated', 'MEMBER') then 'true' else 'false' end
  as proof_can_set_authenticated
\gset
\if :proof_can_set_authenticated
\else
  \echo 'live tenant proof refused: database principal cannot assume authenticated role'
  \quit 21
\endif

select case when count(*) = 2 then 'true' else 'false' end as proof_canonical_org_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('organizations', 'organization_members')
  and c.relrowsecurity
  and c.relforcerowsecurity
\gset
\if :proof_canonical_org_rls
\else
  \echo 'live tenant proof refused: canonical organization RLS/FORCE RLS is incomplete'
  \quit 22
\endif

select case when count(*) = 2 then 'true' else 'false' end as proof_evidence_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('evidence_items', 'evidence_item_audit_events')
  and c.relrowsecurity
  and c.relforcerowsecurity
\gset
\if :proof_evidence_rls
\else
  \echo 'live tenant proof refused: Evidence Vault RLS/FORCE RLS is incomplete'
  \quit 23
\endif

select case when
  (select count(*)
     from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'rls_compliance_evidence_objects_select_organization',
        'rls_compliance_evidence_objects_insert_organization'
      )) = 2
  and not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'users can update own compliance evidence files',
        'users can delete own compliance evidence files',
        'rls_compliance_evidence_objects_update_owner',
        'rls_compliance_evidence_objects_delete_owner',
        'rls_compliance_evidence_objects_update_organization',
        'rls_compliance_evidence_objects_delete_organization'
      )
  )
  and not has_table_privilege('authenticated', 'public.evidence_items', 'DELETE')
then 'true' else 'false' end as proof_evidence_storage_policies
\gset
\if :proof_evidence_storage_policies
\else
  \echo 'live tenant proof refused: Evidence Vault Storage or hard-delete boundary is not canonical'
  \quit 24
\endif

-- Pick a deterministic pair of real auth users whose target organizations are
-- mutually foreign. to_jsonb keeps this proof compatible with the rollout
-- boundary while preferring active memberships when the status field exists.
with candidate_pairs as (
  select
    a.user_id as actor_a,
    a.organization_id as org_a,
    b.user_id as actor_b,
    b.organization_id as org_b
  from public.organization_members a
  join auth.users auth_a on auth_a.id = a.user_id
  join public.organization_members b
    on b.organization_id <> a.organization_id
   and b.user_id <> a.user_id
  join auth.users auth_b on auth_b.id = b.user_id
  where coalesce(to_jsonb(a) ->> 'status', 'active') = 'active'
    and coalesce(to_jsonb(b) ->> 'status', 'active') = 'active'
    and not exists (
      select 1
      from public.organization_members cross_a
      where cross_a.user_id = a.user_id
        and cross_a.organization_id = b.organization_id
    )
    and not exists (
      select 1
      from public.organization_members cross_b
      where cross_b.user_id = b.user_id
        and cross_b.organization_id = a.organization_id
    )
  order by a.organization_id, a.user_id, b.organization_id, b.user_id
  limit 1
)
select actor_a::text as actor_a, org_a::text as org_a, actor_b::text as actor_b, org_b::text as org_b
from candidate_pairs
\gset proof_

\if :{?proof_actor_a}
\else
  \echo 'live tenant proof refused: no isolated pair of existing authenticated tenant actors is available'
  \quit 25
\endif

-- Actor A: own organization and own membership must be visible; the mutually
-- foreign organization and its known member row must be invisible under RLS.
select set_config('request.jwt.claim.sub', :'proof_actor_a', true) as ignored
\gset session_
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'proof_actor_a', 'role', 'authenticated')::text,
  true
) as ignored
\gset session_
set local role authenticated;

select case when count(*) = 1 then 'true' else 'false' end as proof_actor_a_own_org_visible
from public.organizations
where id = :'proof_org_a'::uuid
\gset
select case when count(*) = 0 then 'true' else 'false' end as proof_actor_a_foreign_org_hidden
from public.organizations
where id = :'proof_org_b'::uuid
\gset
select case when count(*) = 1 then 'true' else 'false' end as proof_actor_a_own_membership_visible
from public.organization_members
where organization_id = :'proof_org_a'::uuid
  and user_id = :'proof_actor_a'::uuid
\gset
select case when count(*) = 0 then 'true' else 'false' end as proof_actor_a_foreign_membership_hidden
from public.organization_members
where organization_id = :'proof_org_b'::uuid
  and user_id = :'proof_actor_b'::uuid
\gset

reset role;

\if :proof_actor_a_own_org_visible
\else
  \echo 'live tenant proof failed: actor A cannot read its own organization'
  \quit 26
\endif
\if :proof_actor_a_foreign_org_hidden
\else
  \echo 'live tenant proof failed: actor A can read a foreign organization'
  \quit 27
\endif
\if :proof_actor_a_own_membership_visible
\else
  \echo 'live tenant proof failed: actor A cannot read its own membership'
  \quit 28
\endif
\if :proof_actor_a_foreign_membership_hidden
\else
  \echo 'live tenant proof failed: actor A can read a foreign membership'
  \quit 29
\endif

-- Actor B proves the boundary in the opposite direction.
select set_config('request.jwt.claim.sub', :'proof_actor_b', true) as ignored
\gset session_
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'proof_actor_b', 'role', 'authenticated')::text,
  true
) as ignored
\gset session_
set local role authenticated;

select case when count(*) = 1 then 'true' else 'false' end as proof_actor_b_own_org_visible
from public.organizations
where id = :'proof_org_b'::uuid
\gset
select case when count(*) = 0 then 'true' else 'false' end as proof_actor_b_foreign_org_hidden
from public.organizations
where id = :'proof_org_a'::uuid
\gset
select case when count(*) = 1 then 'true' else 'false' end as proof_actor_b_own_membership_visible
from public.organization_members
where organization_id = :'proof_org_b'::uuid
  and user_id = :'proof_actor_b'::uuid
\gset
select case when count(*) = 0 then 'true' else 'false' end as proof_actor_b_foreign_membership_hidden
from public.organization_members
where organization_id = :'proof_org_a'::uuid
  and user_id = :'proof_actor_a'::uuid
\gset

reset role;

\if :proof_actor_b_own_org_visible
\else
  \echo 'live tenant proof failed: actor B cannot read its own organization'
  \quit 30
\endif
\if :proof_actor_b_foreign_org_hidden
\else
  \echo 'live tenant proof failed: actor B can read a foreign organization'
  \quit 31
\endif
\if :proof_actor_b_own_membership_visible
\else
  \echo 'live tenant proof failed: actor B cannot read its own membership'
  \quit 32
\endif
\if :proof_actor_b_foreign_membership_hidden
\else
  \echo 'live tenant proof failed: actor B can read a foreign membership'
  \quit 33
\endif

rollback;
\set QUIET 0
select 'live_tenant_isolation_passed' as status;
