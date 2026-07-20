-- Governance mutations must pass through audited, rate-limited server boundaries.
-- Preserve tenant-scoped reads while denying direct PostgREST writes from clients.

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'ai_literacy_programs',
    'ai_literacy_courses',
    'ai_literacy_assignments',
    'ai_literacy_evidence',
    'enterprise_evidence_packs',
    'enterprise_evidence_pack_items',
    'enterprise_vendor_due_diligence',
    'enterprise_risk_reviews'
  ] loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception 'Required governance table public.% is missing', table_name;
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    -- Remove every legacy write policy regardless of its historical name.
    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end
$$;

-- AI literacy programmes
drop policy if exists "Members can read AI literacy programmes" on public.ai_literacy_programs;
drop policy if exists "rls_ai_literacy_programs_select_member" on public.ai_literacy_programs;
create policy "rls_ai_literacy_programs_select_member" on public.ai_literacy_programs
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_ai_literacy_programs_insert_backend_only" on public.ai_literacy_programs
  for insert to authenticated with check (false);
create policy "rls_ai_literacy_programs_update_backend_only" on public.ai_literacy_programs
  for update to authenticated using (false) with check (false);
create policy "rls_ai_literacy_programs_delete_backend_only" on public.ai_literacy_programs
  for delete to authenticated using (false);

-- AI literacy courses
drop policy if exists "Members can read AI literacy courses" on public.ai_literacy_courses;
drop policy if exists "rls_ai_literacy_courses_select_member" on public.ai_literacy_courses;
create policy "rls_ai_literacy_courses_select_member" on public.ai_literacy_courses
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_ai_literacy_courses_insert_backend_only" on public.ai_literacy_courses
  for insert to authenticated with check (false);
create policy "rls_ai_literacy_courses_update_backend_only" on public.ai_literacy_courses
  for update to authenticated using (false) with check (false);
create policy "rls_ai_literacy_courses_delete_backend_only" on public.ai_literacy_courses
  for delete to authenticated using (false);

-- AI literacy assignments
drop policy if exists "Members can read AI literacy assignments" on public.ai_literacy_assignments;
drop policy if exists "rls_ai_literacy_assignments_select_member" on public.ai_literacy_assignments;
create policy "rls_ai_literacy_assignments_select_member" on public.ai_literacy_assignments
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_ai_literacy_assignments_insert_backend_only" on public.ai_literacy_assignments
  for insert to authenticated with check (false);
create policy "rls_ai_literacy_assignments_update_backend_only" on public.ai_literacy_assignments
  for update to authenticated using (false) with check (false);
create policy "rls_ai_literacy_assignments_delete_backend_only" on public.ai_literacy_assignments
  for delete to authenticated using (false);

-- AI literacy evidence
drop policy if exists "Members can read AI literacy evidence" on public.ai_literacy_evidence;
drop policy if exists "rls_ai_literacy_evidence_select_member" on public.ai_literacy_evidence;
create policy "rls_ai_literacy_evidence_select_member" on public.ai_literacy_evidence
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_ai_literacy_evidence_insert_backend_only" on public.ai_literacy_evidence
  for insert to authenticated with check (false);
create policy "rls_ai_literacy_evidence_update_backend_only" on public.ai_literacy_evidence
  for update to authenticated using (false) with check (false);
create policy "rls_ai_literacy_evidence_delete_backend_only" on public.ai_literacy_evidence
  for delete to authenticated using (false);

-- Enterprise evidence packs
drop policy if exists "Members can read enterprise evidence packs" on public.enterprise_evidence_packs;
drop policy if exists "rls_enterprise_evidence_packs_select_member" on public.enterprise_evidence_packs;
create policy "rls_enterprise_evidence_packs_select_member" on public.enterprise_evidence_packs
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_enterprise_evidence_packs_insert_backend_only" on public.enterprise_evidence_packs
  for insert to authenticated with check (false);
create policy "rls_enterprise_evidence_packs_update_backend_only" on public.enterprise_evidence_packs
  for update to authenticated using (false) with check (false);
create policy "rls_enterprise_evidence_packs_delete_backend_only" on public.enterprise_evidence_packs
  for delete to authenticated using (false);

-- Enterprise evidence pack items
drop policy if exists "Members can read enterprise evidence pack items" on public.enterprise_evidence_pack_items;
drop policy if exists "rls_enterprise_evidence_pack_items_select_member" on public.enterprise_evidence_pack_items;
create policy "rls_enterprise_evidence_pack_items_select_member" on public.enterprise_evidence_pack_items
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_enterprise_evidence_pack_items_insert_backend_only" on public.enterprise_evidence_pack_items
  for insert to authenticated with check (false);
create policy "rls_enterprise_evidence_pack_items_update_backend_only" on public.enterprise_evidence_pack_items
  for update to authenticated using (false) with check (false);
create policy "rls_enterprise_evidence_pack_items_delete_backend_only" on public.enterprise_evidence_pack_items
  for delete to authenticated using (false);

-- Enterprise vendor due diligence
drop policy if exists "Members can read enterprise vendor due diligence" on public.enterprise_vendor_due_diligence;
drop policy if exists "rls_enterprise_vendor_due_diligence_select_member" on public.enterprise_vendor_due_diligence;
create policy "rls_enterprise_vendor_due_diligence_select_member" on public.enterprise_vendor_due_diligence
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_enterprise_vendor_due_diligence_insert_backend_only" on public.enterprise_vendor_due_diligence
  for insert to authenticated with check (false);
create policy "rls_enterprise_vendor_due_diligence_update_backend_only" on public.enterprise_vendor_due_diligence
  for update to authenticated using (false) with check (false);
create policy "rls_enterprise_vendor_due_diligence_delete_backend_only" on public.enterprise_vendor_due_diligence
  for delete to authenticated using (false);

-- Enterprise risk reviews
drop policy if exists "Members can read enterprise risk reviews" on public.enterprise_risk_reviews;
drop policy if exists "rls_enterprise_risk_reviews_select_member" on public.enterprise_risk_reviews;
create policy "rls_enterprise_risk_reviews_select_member" on public.enterprise_risk_reviews
  for select to authenticated using (public.enterprise_member_can_read(organization_id));
create policy "rls_enterprise_risk_reviews_insert_backend_only" on public.enterprise_risk_reviews
  for insert to authenticated with check (false);
create policy "rls_enterprise_risk_reviews_update_backend_only" on public.enterprise_risk_reviews
  for update to authenticated using (false) with check (false);
create policy "rls_enterprise_risk_reviews_delete_backend_only" on public.enterprise_risk_reviews
  for delete to authenticated using (false);

revoke insert, update, delete on public.ai_literacy_programs from anon, authenticated;
revoke insert, update, delete on public.ai_literacy_courses from anon, authenticated;
revoke insert, update, delete on public.ai_literacy_assignments from anon, authenticated;
revoke insert, update, delete on public.ai_literacy_evidence from anon, authenticated;
revoke insert, update, delete on public.enterprise_evidence_packs from anon, authenticated;
revoke insert, update, delete on public.enterprise_evidence_pack_items from anon, authenticated;
revoke insert, update, delete on public.enterprise_vendor_due_diligence from anon, authenticated;
revoke insert, update, delete on public.enterprise_risk_reviews from anon, authenticated;

grant select on public.ai_literacy_programs to authenticated;
grant select on public.ai_literacy_courses to authenticated;
grant select on public.ai_literacy_assignments to authenticated;
grant select on public.ai_literacy_evidence to authenticated;
grant select on public.enterprise_evidence_packs to authenticated;
grant select on public.enterprise_evidence_pack_items to authenticated;
grant select on public.enterprise_vendor_due_diligence to authenticated;
grant select on public.enterprise_risk_reviews to authenticated;

grant select, insert, update, delete on public.ai_literacy_programs to service_role;
grant select, insert, update, delete on public.ai_literacy_courses to service_role;
grant select, insert, update, delete on public.ai_literacy_assignments to service_role;
grant select, insert, update, delete on public.ai_literacy_evidence to service_role;
grant select, insert, update, delete on public.enterprise_evidence_packs to service_role;
grant select, insert, update, delete on public.enterprise_evidence_pack_items to service_role;
grant select, insert, update, delete on public.enterprise_vendor_due_diligence to service_role;
grant select, insert, update, delete on public.enterprise_risk_reviews to service_role;

notify pgrst, 'reload schema';
