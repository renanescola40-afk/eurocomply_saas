begin;

-- Require canonical active membership for governance reads.
alter policy ai_annex_iv_changes_member_select
on public.ai_annex_iv_changes
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_annex_iv_decisions_member_select
on public.ai_annex_iv_decisions
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_annex_iv_evidence_member_select
on public.ai_annex_iv_evidence
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_annex_iv_packages_member_select
on public.ai_annex_iv_packages
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_annex_iv_sections_member_select
on public.ai_annex_iv_sections
to authenticated
using (app_private.is_org_member(organization_id));

alter policy article50_assessments_member_read
on public.ai_article50_assessments
to authenticated
using (app_private.is_org_member(organization_id));

alter policy article50_events_member_read
on public.ai_article50_events
to authenticated
using (app_private.is_org_member(organization_id));

alter policy article50_evidence_member_read
on public.ai_article50_evidence
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_qms_audits_member_select
on public.ai_qms_audits
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_qms_controls_member_select
on public.ai_qms_controls
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_qms_decisions_member_select
on public.ai_qms_decisions
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_qms_management_reviews_member_select
on public.ai_qms_management_reviews
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_qms_nonconformities_member_select
on public.ai_qms_nonconformities
to authenticated
using (app_private.is_org_member(organization_id));

alter policy ai_qms_systems_member_select
on public.ai_qms_systems
to authenticated
using (app_private.is_org_member(organization_id));

commit;
