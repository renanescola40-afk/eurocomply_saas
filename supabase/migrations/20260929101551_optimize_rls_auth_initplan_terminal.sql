-- Terminal database hardening: preserve RLS semantics while evaluating auth.uid() once per statement.

alter policy ai_qms_audits_member_select on public.ai_qms_audits
  using (exists (select 1 from public.organization_members member where member.organization_id = ai_qms_audits.organization_id and member.user_id = (select auth.uid())));
alter policy ai_qms_controls_member_select on public.ai_qms_controls
  using (exists (select 1 from public.organization_members member where member.organization_id = ai_qms_controls.organization_id and member.user_id = (select auth.uid())));
alter policy ai_qms_decisions_member_select on public.ai_qms_decisions
  using (exists (select 1 from public.organization_members member where member.organization_id = ai_qms_decisions.organization_id and member.user_id = (select auth.uid())));
alter policy ai_qms_management_reviews_member_select on public.ai_qms_management_reviews
  using (exists (select 1 from public.organization_members member where member.organization_id = ai_qms_management_reviews.organization_id and member.user_id = (select auth.uid())));
alter policy ai_qms_nonconformities_member_select on public.ai_qms_nonconformities
  using (exists (select 1 from public.organization_members member where member.organization_id = ai_qms_nonconformities.organization_id and member.user_id = (select auth.uid())));
alter policy ai_qms_systems_member_select on public.ai_qms_systems
  using (exists (select 1 from public.organization_members member where member.organization_id = ai_qms_systems.organization_id and member.user_id = (select auth.uid())));

alter policy "audit checkpoints organization members read" on public.audit_integrity_checkpoints
  using (exists (select 1 from public.organization_members m where m.organization_id = audit_integrity_checkpoints.organization_id and m.user_id = (select auth.uid()) and coalesce(m.status,'active')='active'));

alter policy rls_compliance_evidence_delete_owner on public.compliance_evidence using (user_id = (select auth.uid()));
alter policy rls_compliance_evidence_insert_owner on public.compliance_evidence
  with check ((user_id = (select auth.uid())) and (finding_id is null or exists (select 1 from public.compliance_findings cf where cf.id = compliance_evidence.finding_id and cf.user_id = (select auth.uid()))) and (task_id is null or exists (select 1 from public.compliance_tasks ct where ct.id = compliance_evidence.task_id and (((ct.organization_id is null) and ct.user_id = (select auth.uid())) or ((ct.organization_id is not null) and app_private.is_org_member(ct.organization_id))))));
alter policy rls_compliance_evidence_select_owner on public.compliance_evidence using (user_id = (select auth.uid()));
alter policy rls_compliance_evidence_update_owner on public.compliance_evidence
  using (user_id = (select auth.uid()))
  with check ((user_id = (select auth.uid())) and (finding_id is null or exists (select 1 from public.compliance_findings cf where cf.id = compliance_evidence.finding_id and cf.user_id = (select auth.uid()))) and (task_id is null or exists (select 1 from public.compliance_tasks ct where ct.id = compliance_evidence.task_id and (((ct.organization_id is null) and ct.user_id = (select auth.uid())) or ((ct.organization_id is not null) and app_private.is_org_member(ct.organization_id))))));

alter policy rls_compliance_findings_insert_owner on public.compliance_findings
  with check ((user_id = (select auth.uid())) and (assessment_id is null or exists (select 1 from public.gap_assessments ga where ga.id = compliance_findings.assessment_id and ga.user_id = (select auth.uid()) and not (compliance_findings.workspace_id is distinct from ga.workspace_id))));
alter policy rls_compliance_findings_select_owner on public.compliance_findings using (user_id = (select auth.uid()));
alter policy rls_compliance_findings_update_owner on public.compliance_findings
  using (user_id = (select auth.uid()))
  with check ((user_id = (select auth.uid())) and (assessment_id is null or exists (select 1 from public.gap_assessments ga where ga.id = compliance_findings.assessment_id and ga.user_id = (select auth.uid()) and not (compliance_findings.workspace_id is distinct from ga.workspace_id))));

alter policy restrict_authenticated_compliance_task_insert_to_personal on public.compliance_tasks
  with check ((organization_id is null) and (workspace_id is null) and (user_id = (select auth.uid())) and (owner_id is null or owner_id = (select auth.uid())) and (created_by is null or created_by = (select auth.uid())) and (assigned_to is null or assigned_to = (select auth.uid())));
alter policy rls_compliance_tasks_insert_personal on public.compliance_tasks
  with check ((organization_id is null) and (workspace_id is null) and (user_id = (select auth.uid())) and (owner_id is null or owner_id = (select auth.uid())) and (created_by is null or created_by = (select auth.uid())) and (assigned_to is null or assigned_to = (select auth.uid())) and (finding_id is null or exists (select 1 from public.compliance_findings cf where cf.id = compliance_tasks.finding_id and cf.user_id = (select auth.uid()))));
alter policy rls_compliance_tasks_select_personal on public.compliance_tasks
  using ((organization_id is null) and (user_id = (select auth.uid())));

alter policy "retention policies organization members read" on public.data_retention_policies
  using (exists (select 1 from public.organization_members m where m.organization_id = data_retention_policies.organization_id and m.user_id = (select auth.uid()) and coalesce(m.status,'active')='active'));
alter policy "data subjects read own requests" on public.data_subject_requests
  using ((requester_user_id = (select auth.uid())) or exists (select 1 from public.organization_members m where m.organization_id = data_subject_requests.organization_id and m.user_id = (select auth.uid()) and coalesce(m.status,'active')='active' and m.role = any(array['owner'::text,'admin'::text])));
alter policy rls_evidence_items_insert_organization on public.evidence_items
  with check (app_private.has_org_role(organization_id,array['owner'::text,'admin'::text,'member'::text]) and user_id = (select auth.uid()) and (finding_id is null or exists (select 1 from public.compliance_findings cf where cf.id = evidence_items.finding_id and cf.user_id = evidence_items.user_id)) and (task_id is null or exists (select 1 from public.compliance_tasks ct where ct.id = evidence_items.task_id and ct.organization_id = evidence_items.organization_id)));

alter policy rls_gap_answers_insert_owner on public.gap_answers
  with check (exists (select 1 from public.gap_assessments ga where ga.id = gap_answers.assessment_id and ga.user_id = (select auth.uid()) and not (gap_answers.workspace_id is distinct from ga.workspace_id)));
alter policy rls_gap_answers_select_owner on public.gap_answers
  using (exists (select 1 from public.gap_assessments ga where ga.id = gap_answers.assessment_id and ga.user_id = (select auth.uid())));
alter policy rls_gap_answers_update_owner on public.gap_answers
  using (exists (select 1 from public.gap_assessments ga where ga.id = gap_answers.assessment_id and ga.user_id = (select auth.uid())))
  with check (exists (select 1 from public.gap_assessments ga where ga.id = gap_answers.assessment_id and ga.user_id = (select auth.uid()) and not (gap_answers.workspace_id is distinct from ga.workspace_id)));
alter policy rls_gap_assessments_insert_owner on public.gap_assessments with check (user_id = (select auth.uid()));
alter policy rls_gap_assessments_select_owner on public.gap_assessments using (user_id = (select auth.uid()));
alter policy rls_gap_assessments_update_owner on public.gap_assessments
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
