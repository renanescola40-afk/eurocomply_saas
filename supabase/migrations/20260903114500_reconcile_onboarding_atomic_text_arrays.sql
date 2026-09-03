begin;

-- Forward-only production fix for the active onboarding RPC.
-- Clean repository replay still has the original JSONB ai_systems contract,
-- while live production currently exposes obligations/next_actions as text[].
-- Preserve whichever reviewed schema is present and coerce validated JSON input
-- through the actual ai_systems row type instead of changing column types.

do $preflight$
declare
  obligations_type text;
  next_actions_type text;
begin
  if to_regprocedure('public.complete_onboarding_activation_atomic(uuid,uuid,text,jsonb)') is null
     or to_regprocedure('public.complete_onboarding_activation_atomic_reconciled(uuid,uuid,text,jsonb)') is null then
    raise exception 'active onboarding RPC functions must exist before schema-adaptive reconciliation';
  end if;

  select format_type(a.atttypid, a.atttypmod)
  into obligations_type
  from pg_attribute a
  where a.attrelid = 'public.ai_systems'::regclass
    and a.attname = 'obligations'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
  into next_actions_type
  from pg_attribute a
  where a.attrelid = 'public.ai_systems'::regclass
    and a.attname = 'next_actions'
    and a.attnum > 0
    and not a.attisdropped;

  if obligations_type is null
     or next_actions_type is null
     or obligations_type <> next_actions_type
     or obligations_type not in ('jsonb', 'text[]') then
    raise exception 'ai_systems obligations/next_actions schema is outside the reviewed jsonb/text[] contracts';
  end if;
end
$preflight$;

create or replace function public.complete_onboarding_activation_atomic_reconciled(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_activation jsonb
)
returns table (
  outcome text,
  activation_run_id uuid,
  first_ai_system_id uuid,
  documents_created integer,
  tasks_created integer,
  invitations_created integer,
  organization_name text,
  invitation_deliveries jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_organization public.organizations%rowtype;
  v_existing_run public.onboarding_activation_runs%rowtype;
  v_actor_role text;
  v_actor_status text;
  v_organization_profile jsonb := coalesce(p_activation -> 'organization', '{}'::jsonb);
  v_ai_system jsonb := coalesce(p_activation -> 'aiSystem', '{}'::jsonb);
  v_recommended_documents jsonb := coalesce(p_activation -> 'recommendedDocuments', '[]'::jsonb);
  v_suggested_tasks jsonb := coalesce(p_activation -> 'suggestedTasks', '[]'::jsonb);
  v_invite_emails jsonb := coalesce(p_activation -> 'inviteEmails', '[]'::jsonb);
  v_invite_email_array text[] := '{}'::text[];
  v_obligations public.ai_systems.obligations%type;
  v_next_actions public.ai_systems.next_actions%type;
  v_readiness_score integer;
  v_ai_system_id uuid;
  v_activation_run_id uuid;
  v_item jsonb;
  v_email text;
  v_invitation_token text;
  v_seat_invitation record;
  v_documents_created integer := 0;
  v_tasks_created integer := 0;
  v_invitations_created integer := 0;
  v_invitation_deliveries jsonb := '[]'::jsonb;
begin
  if p_organization_id is null
    or p_actor_user_id is null
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[a-f0-9]{64}$'
    or p_activation is null
    or jsonb_typeof(p_activation) <> 'object'
    or jsonb_typeof(v_organization_profile) <> 'object'
    or jsonb_typeof(v_ai_system) <> 'object'
    or jsonb_typeof(v_recommended_documents) <> 'array'
    or jsonb_typeof(v_suggested_tasks) <> 'array'
    or jsonb_typeof(v_invite_emails) <> 'array'
    or jsonb_typeof(coalesce(v_ai_system -> 'obligations', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)) <> 'array'
    or coalesce(p_activation ->> 'readinessScore', '') !~ '^[0-9]{1,3}$' then
    return query select
      'invalid_input'::text, null::uuid, null::uuid, 0, 0, 0, ''::text, '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_ai_system -> 'obligations', '[]'::jsonb)) as obligation(value)
    where jsonb_typeof(obligation.value) <> 'string'
  ) or exists (
    select 1
    from jsonb_array_elements(coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)) as next_action(value)
    where jsonb_typeof(next_action.value) <> 'string'
  ) then
    return query select
      'invalid_input'::text, null::uuid, null::uuid, 0, 0, 0, ''::text, '[]'::jsonb;
    return;
  end if;

  select populated.obligations, populated.next_actions
  into v_obligations, v_next_actions
  from jsonb_populate_record(
    null::public.ai_systems,
    jsonb_build_object(
      'obligations', coalesce(v_ai_system -> 'obligations', '[]'::jsonb),
      'next_actions', coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)
    )
  ) as populated;

  v_readiness_score := (p_activation ->> 'readinessScore')::integer;
  if v_readiness_score < 0
    or v_readiness_score > 100
    or char_length(trim(coalesce(v_organization_profile ->> 'name', ''))) < 2
    or char_length(trim(coalesce(v_organization_profile ->> 'slug', ''))) < 3
    or char_length(trim(coalesce(v_ai_system ->> 'name', ''))) < 2
    or char_length(trim(coalesce(v_ai_system ->> 'useCase', ''))) < 10
    or coalesce(v_ai_system ->> 'role', '') not in ('provider', 'deployer', 'importer', 'distributor', 'other')
    or coalesce(v_ai_system ->> 'lifecycleStatus', '') not in ('planned', 'pilot', 'production', 'retired')
    or coalesce(v_ai_system ->> 'riskLevel', '') not in ('prohibited_review', 'high_risk_review', 'limited_transparency', 'minimal_or_low') then
    return query select
      'invalid_input'::text, null::uuid, null::uuid, 0, 0, 0, ''::text, '[]'::jsonb;
    return;
  end if;

  select coalesce(array_agg(lower(trim(invited.value #>> '{}')) order by lower(trim(invited.value #>> '{}'))), '{}'::text[])
  into v_invite_email_array
  from jsonb_array_elements(v_invite_emails) as invited(value);

  select organizations.*
  into v_organization
  from public.organizations as organizations
  where organizations.id = p_organization_id
  for update;

  if not found then
    return query select
      'not_found'::text, null::uuid, null::uuid, 0, 0, 0, ''::text, '[]'::jsonb;
    return;
  end if;

  select lower(trim(members.role)), lower(trim(members.status))
  into v_actor_role, v_actor_status
  from public.organization_members as members
  where members.organization_id = p_organization_id
    and members.user_id = p_actor_user_id;

  if v_actor_status is distinct from 'active'
     or coalesce(v_actor_role, '') not in ('owner', 'admin') then
    return query select
      'forbidden'::text, null::uuid, null::uuid, 0, 0, 0, v_organization.name, '[]'::jsonb;
    return;
  end if;

  select runs.*
  into v_existing_run
  from public.onboarding_activation_runs as runs
  where runs.organization_id = p_organization_id
    and runs.idempotency_key = p_idempotency_key
  limit 1;

  if found then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', invitations.id,
          'email', invitations.email,
          'role', invitations.role,
          'token', invitations.token
        ) order by invitations.email
      ),
      '[]'::jsonb
    )
    into v_invitation_deliveries
    from public.invitations as invitations
    where invitations.organization_id = p_organization_id
      and invitations.accepted_at is null
      and invitations.revoked_at is null
      and invitations.expires_at > now()
      and invitations.email = any(coalesce(v_existing_run.invited_emails, '{}'::text[]));

    return query select
      'replayed'::text,
      v_existing_run.id,
      v_existing_run.first_ai_system_id,
      0,
      0,
      0,
      v_organization.name,
      v_invitation_deliveries;
    return;
  end if;

  if nullif(v_ai_system ->> 'id', '') is not null then
    begin
      v_ai_system_id := (v_ai_system ->> 'id')::uuid;
    exception when invalid_text_representation then
      return query select
        'invalid_input'::text, null::uuid, null::uuid, 0, 0, 0, v_organization.name, '[]'::jsonb;
      return;
    end;

    update public.ai_systems as systems
    set
      name = trim(v_ai_system ->> 'name'),
      owner_team = nullif(trim(coalesce(v_ai_system ->> 'ownerTeam', '')), ''),
      vendor_name = nullif(trim(coalesce(v_ai_system ->> 'vendorName', '')), ''),
      use_case = trim(v_ai_system ->> 'useCase'),
      role = v_ai_system ->> 'role',
      lifecycle_status = v_ai_system ->> 'lifecycleStatus',
      risk_domain = v_ai_system ->> 'riskDomain',
      uses_personal_data = coalesce((v_ai_system ->> 'usesPersonalData')::boolean, false),
      interacts_with_people = coalesce((v_ai_system ->> 'interactsWithPeople')::boolean, false),
      generates_content = coalesce((v_ai_system ->> 'generatesContent')::boolean, false),
      biometric_identification = coalesce((v_ai_system ->> 'biometricIdentification')::boolean, false),
      manipulative_or_exploitative = coalesce((v_ai_system ->> 'manipulativeOrExploitative')::boolean, false),
      risk_level = v_ai_system ->> 'riskLevel',
      classification_summary = coalesce(v_ai_system ->> 'classificationSummary', ''),
      obligations = v_obligations,
      next_actions = v_next_actions
    where systems.id = v_ai_system_id
      and systems.organization_id = p_organization_id
    returning systems.id into v_ai_system_id;

    if not found then
      return query select
        'ai_system_not_found'::text, null::uuid, null::uuid, 0, 0, 0, v_organization.name, '[]'::jsonb;
      return;
    end if;
  else
    insert into public.ai_systems (
      organization_id,
      name,
      owner_team,
      vendor_name,
      use_case,
      role,
      lifecycle_status,
      risk_domain,
      uses_personal_data,
      interacts_with_people,
      generates_content,
      biometric_identification,
      manipulative_or_exploitative,
      risk_level,
      classification_summary,
      obligations,
      next_actions,
      created_by
    ) values (
      p_organization_id,
      trim(v_ai_system ->> 'name'),
      nullif(trim(coalesce(v_ai_system ->> 'ownerTeam', '')), ''),
      nullif(trim(coalesce(v_ai_system ->> 'vendorName', '')), ''),
      trim(v_ai_system ->> 'useCase'),
      v_ai_system ->> 'role',
      v_ai_system ->> 'lifecycleStatus',
      v_ai_system ->> 'riskDomain',
      coalesce((v_ai_system ->> 'usesPersonalData')::boolean, false),
      coalesce((v_ai_system ->> 'interactsWithPeople')::boolean, false),
      coalesce((v_ai_system ->> 'generatesContent')::boolean, false),
      coalesce((v_ai_system ->> 'biometricIdentification')::boolean, false),
      coalesce((v_ai_system ->> 'manipulativeOrExploitative')::boolean, false),
      v_ai_system ->> 'riskLevel',
      coalesce(v_ai_system ->> 'classificationSummary', ''),
      v_obligations,
      v_next_actions,
      p_actor_user_id
    )
    returning id into v_ai_system_id;
  end if;

  for v_item in
    select recommendations.value
    from jsonb_array_elements(v_recommended_documents) as recommendations(value)
  loop
    if coalesce(v_item ->> 'id', '') !~ '^[a-z0-9-]{1,80}$' then
      raise exception 'invalid_document_recommendation' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.documents as documents
      where documents.organization_id = p_organization_id
        and documents.category = 'onboarding_recommended'
        and documents.metadata ->> 'recommendationId' = v_item ->> 'id'
    ) then
      insert into public.documents (
        organization_id,
        uploaded_by,
        title,
        name,
        category,
        storage_path,
        mime_type,
        size_bytes,
        status,
        metadata
      ) values (
        p_organization_id,
        p_actor_user_id,
        trim(v_item ->> 'title'),
        trim(v_item ->> 'title'),
        'onboarding_recommended',
        p_organization_id::text || '/onboarding/recommended/' || (v_item ->> 'id') || '.md',
        'text/markdown',
        0,
        'suggested',
        jsonb_build_object(
          'source', 'onboarding_activation',
          'recommendationId', v_item ->> 'id',
          'priority', v_item ->> 'priority',
          'reason', v_item ->> 'reason',
          'generatedAt', now()
        )
      );
      v_documents_created := v_documents_created + 1;
    end if;
  end loop;

  for v_item in
    select suggestions.value
    from jsonb_array_elements(v_suggested_tasks) as suggestions(value)
  loop
    if coalesce(v_item ->> 'id', '') !~ '^[a-z0-9-]{1,80}$'
      or coalesce(v_item ->> 'dueInDays', '') !~ '^[0-9]{1,3}$' then
      raise exception 'invalid_task_suggestion' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.compliance_tasks as tasks
      where tasks.organization_id = p_organization_id
        and tasks.category = 'onboarding_activation'
        and tasks.metadata ->> 'suggestionId' = v_item ->> 'id'
    ) then
      insert into public.compliance_tasks (
        organization_id,
        created_by,
        assigned_to,
        title,
        description,
        category,
        status,
        priority,
        due_date,
        metadata
      ) values (
        p_organization_id,
        p_actor_user_id,
        p_actor_user_id,
        trim(v_item ->> 'title'),
        v_item ->> 'description',
        'onboarding_activation',
        'todo',
        v_item ->> 'priority',
        current_date + least((v_item ->> 'dueInDays')::integer, 365),
        jsonb_build_object(
          'source', 'onboarding_activation',
          'suggestionId', v_item ->> 'id'
        )
      );
      v_tasks_created := v_tasks_created + 1;
    end if;
  end loop;

  foreach v_email in array v_invite_email_array
  loop
    if char_length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'invalid_invitation_email' using errcode = '22023';
    end if;

    v_invitation_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

    select *
    into v_seat_invitation
    from public.create_organization_invitation_with_seat_atomic(
      p_organization_id,
      v_email,
      'viewer',
      'viewer',
      v_invitation_token,
      p_actor_user_id,
      now() + interval '7 days'
    );

    if v_seat_invitation.outcome <> 'created' then
      raise exception 'onboarding_invitation_seat_authority_denied:%', v_seat_invitation.outcome
        using errcode = 'P0001';
    end if;

    v_invitations_created := v_invitations_created + 1;
    v_invitation_deliveries := v_invitation_deliveries || jsonb_build_array(
      jsonb_build_object(
        'id', v_seat_invitation.invitation_id,
        'email', v_seat_invitation.email,
        'role', v_seat_invitation.applied_role,
        'token', v_invitation_token
      )
    );
  end loop;

  insert into public.onboarding_activation_runs (
    organization_id,
    created_by,
    country,
    company_type,
    sector,
    ai_usage_level,
    ai_usage_summary,
    first_ai_system_id,
    initial_risk_level,
    readiness_score,
    recommended_documents,
    suggested_tasks,
    invited_emails,
    selected_plan,
    status,
    idempotency_key
  ) values (
    p_organization_id,
    p_actor_user_id,
    v_organization_profile ->> 'country',
    v_organization_profile ->> 'companyType',
    v_organization_profile ->> 'sector',
    v_organization_profile ->> 'aiUsage',
    coalesce(v_organization_profile ->> 'aiUsageSummary', ''),
    v_ai_system_id,
    v_ai_system ->> 'riskLevel',
    v_readiness_score,
    v_recommended_documents,
    v_suggested_tasks,
    v_invite_email_array,
    v_organization_profile ->> 'selectedPlan',
    'completed',
    p_idempotency_key
  )
  returning id into v_activation_run_id;

  update public.organizations as organizations
  set
    name = trim(v_organization_profile ->> 'name'),
    slug = lower(trim(v_organization_profile ->> 'slug')),
    country = v_organization_profile ->> 'country',
    company_type = v_organization_profile ->> 'companyType',
    sector = v_organization_profile ->> 'sector',
    ai_usage_summary = coalesce(v_organization_profile ->> 'aiUsageSummary', ''),
    onboarding_status = 'completed',
    onboarding_step = 'completed',
    selected_plan = v_organization_profile ->> 'selectedPlan',
    readiness_score = v_readiness_score,
    onboarding_completed_at = now(),
    trial_started_at = case
      when v_organization_profile ->> 'selectedPlan' = 'trial' then coalesce(organizations.trial_started_at, now())
      else organizations.trial_started_at
    end,
    metadata = jsonb_set(
      coalesce(organizations.metadata, '{}'::jsonb),
      '{onboarding}',
      jsonb_build_object(
        'aiUsage', v_organization_profile ->> 'aiUsage',
        'selectedPlan', v_organization_profile ->> 'selectedPlan',
        'updatedAt', now()
      ),
      true
    ),
    updated_at = now()
  where organizations.id = p_organization_id;

  return query select
    'completed'::text,
    v_activation_run_id,
    v_ai_system_id,
    v_documents_created,
    v_tasks_created,
    v_invitations_created,
    trim(v_organization_profile ->> 'name'),
    v_invitation_deliveries;
end;
$$;

revoke all on function public.complete_onboarding_activation_atomic_reconciled(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;

comment on function public.complete_onboarding_activation_atomic_reconciled(uuid, uuid, text, jsonb)
is 'Internal active onboarding transaction with schema-adaptive obligations/next_actions coercion for reviewed JSONB or text[] ai_systems contracts.';

do $verify$
declare
  wrapper_oid oid := to_regprocedure('public.complete_onboarding_activation_atomic(uuid,uuid,text,jsonb)');
  inner_oid oid := to_regprocedure('public.complete_onboarding_activation_atomic_reconciled(uuid,uuid,text,jsonb)');
  inner_source text;
begin
  if wrapper_oid is null or inner_oid is null then
    raise exception 'active onboarding wrapper/inner function missing after schema-adaptive reconciliation';
  end if;

  select pg_get_functiondef(inner_oid) into inner_source;

  if position('jsonb_populate_record' in inner_source) = 0
     or position('obligations = v_obligations' in inner_source) = 0
     or position('next_actions = v_next_actions' in inner_source) = 0
     or position($stale$obligations = coalesce(v_ai_system -> 'obligations', '[]'::jsonb)$stale$ in inner_source) > 0
     or position($stale$next_actions = coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)$stale$ in inner_source) > 0 then
    raise exception 'active onboarding schema-adaptive reconciliation did not replace stale direct JSONB assignments';
  end if;

  if has_function_privilege('anon', wrapper_oid, 'EXECUTE')
     or has_function_privilege('authenticated', wrapper_oid, 'EXECUTE')
     or not has_function_privilege('service_role', wrapper_oid, 'EXECUTE') then
    raise exception 'hardened onboarding wrapper privileges drifted';
  end if;

  if has_function_privilege('anon', inner_oid, 'EXECUTE')
     or has_function_privilege('authenticated', inner_oid, 'EXECUTE')
     or has_function_privilege('service_role', inner_oid, 'EXECUTE') then
    raise exception 'reconciled inner onboarding function became externally executable';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = wrapper_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog, public'
  ) or not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = inner_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog, public'
  ) then
    raise exception 'onboarding SECURITY DEFINER search_path contract drifted';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
