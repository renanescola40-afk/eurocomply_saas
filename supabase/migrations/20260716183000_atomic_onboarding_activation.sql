-- Commit the database portion of onboarding activation as one idempotent,
-- tenant-bound transaction. External email delivery remains outside the
-- transaction and can safely retry with the returned invitation tokens.

alter table if exists public.onboarding_activation_runs
  add column if not exists idempotency_key text;

create unique index if not exists onboarding_activation_runs_org_idempotency_key_idx
  on public.onboarding_activation_runs (organization_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.complete_onboarding_activation_atomic(
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
  v_invitation public.invitations%rowtype;
  v_actor_role text;
  v_organization_profile jsonb := coalesce(p_activation -> 'organization', '{}'::jsonb);
  v_ai_system jsonb := coalesce(p_activation -> 'aiSystem', '{}'::jsonb);
  v_recommended_documents jsonb := coalesce(p_activation -> 'recommendedDocuments', '[]'::jsonb);
  v_suggested_tasks jsonb := coalesce(p_activation -> 'suggestedTasks', '[]'::jsonb);
  v_invite_emails jsonb := coalesce(p_activation -> 'inviteEmails', '[]'::jsonb);
  v_readiness_score integer;
  v_ai_system_id uuid;
  v_activation_run_id uuid;
  v_existing_invitation_id uuid;
  v_item jsonb;
  v_email text;
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
    or coalesce(p_activation ->> 'readinessScore', '') !~ '^[0-9]{1,3}$' then
    return query select
      'invalid_input'::text, null::uuid, null::uuid, 0, 0, 0, ''::text, '[]'::jsonb;
    return;
  end if;

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

  -- Serialize every activation for the tenant. This also makes the metadata
  -- de-duplication checks below safe across concurrent requests.
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

  select lower(trim(members.role))
  into v_actor_role
  from public.organization_members as members
  where members.organization_id = p_organization_id
    and members.user_id = p_actor_user_id;

  if v_actor_role is null or v_actor_role not in ('owner', 'admin') then
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
      and invitations.expires_at > now()
      and invitations.email in (
        select lower(trim(invited.value #>> '{}'))
        from jsonb_array_elements(v_existing_run.invited_emails) as invited(value)
      );

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
      obligations = coalesce(v_ai_system -> 'obligations', '[]'::jsonb),
      next_actions = coalesce(v_ai_system -> 'nextActions', '[]'::jsonb)
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
      coalesce(v_ai_system -> 'obligations', '[]'::jsonb),
      coalesce(v_ai_system -> 'nextActions', '[]'::jsonb),
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
        user_id,
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
        'open',
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

  for v_email in
    select distinct lower(trim(invited.value #>> '{}'))
    from jsonb_array_elements(v_invite_emails) as invited(value)
    order by 1
  loop
    if char_length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'invalid_invitation_email' using errcode = '22023';
    end if;

    select invitations.id
    into v_existing_invitation_id
    from public.invitations as invitations
    where invitations.organization_id = p_organization_id
      and invitations.email = v_email;

    if v_existing_invitation_id is null then
      v_invitations_created := v_invitations_created + 1;
    end if;

    insert into public.invitations (
      organization_id,
      email,
      role,
      token,
      invited_by,
      accepted_at,
      expires_at
    ) values (
      p_organization_id,
      v_email,
      'viewer',
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      p_actor_user_id,
      null,
      now() + interval '7 days'
    )
    on conflict (organization_id, email) do update
    set
      role = excluded.role,
      token = excluded.token,
      invited_by = excluded.invited_by,
      accepted_at = null,
      expires_at = excluded.expires_at
    returning * into v_invitation;

    v_invitation_deliveries := v_invitation_deliveries || jsonb_build_array(
      jsonb_build_object(
        'id', v_invitation.id,
        'email', v_invitation.email,
        'role', v_invitation.role,
        'token', v_invitation.token
      )
    );
    v_existing_invitation_id := null;
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
    v_invite_emails,
    v_organization_profile ->> 'selectedPlan',
    'completed',
    p_idempotency_key
  )
  returning id into v_activation_run_id;

  -- Mark the tenant complete last. Any error in any statement above rolls back
  -- the AI system, recommendations, tasks, invites and activation run together.
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

revoke all on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) from public;
revoke all on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) from anon;
revoke all on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb) to service_role;

comment on function public.complete_onboarding_activation_atomic(uuid, uuid, text, jsonb)
is 'Backend-only, idempotent and tenant-bound database transaction for onboarding activation.';

notify pgrst, 'reload schema';
