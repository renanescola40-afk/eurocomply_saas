-- Defense-in-depth constraints for Article 50 positive claims and cross-table tenant scope.

alter table public.ai_article50_assessments
  add constraint ai_article50_assessment_identity_org_unique
  unique (id, organization_id);

alter table public.ai_article50_assessments
  add constraint ai_article50_marking_claim_requires_evidence
  check (
    not provider_machine_readable_marking
    or nullif(btrim(coalesce(marking_evidence_reference, '')), '') is not null
  );

alter table public.ai_article50_assessments
  add constraint ai_article50_disclosure_claim_requires_evidence
  check (
    not deployer_disclosure
    or (
      nullif(btrim(coalesce(disclosure_copy, '')), '') is not null
      and nullif(btrim(coalesce(disclosure_language, '')), '') is not null
      and nullif(btrim(coalesce(disclosure_channel, '')), '') is not null
      and nullif(btrim(coalesce(display_evidence_reference, '')), '') is not null
    )
  );

alter table public.ai_article50_evidence
  add constraint ai_article50_evidence_assessment_org_fk
  foreign key (assessment_id, organization_id)
  references public.ai_article50_assessments(id, organization_id)
  on delete cascade;

alter table public.ai_article50_events
  add constraint ai_article50_events_assessment_org_fk
  foreign key (assessment_id, organization_id)
  references public.ai_article50_assessments(id, organization_id)
  on delete cascade;

comment on constraint ai_article50_marking_claim_requires_evidence
  on public.ai_article50_assessments is
  'A positive provider marking claim requires a retained evidence reference.';
comment on constraint ai_article50_disclosure_claim_requires_evidence
  on public.ai_article50_assessments is
  'A positive deployer disclosure claim requires exact copy, language, channel and proof of display.';
