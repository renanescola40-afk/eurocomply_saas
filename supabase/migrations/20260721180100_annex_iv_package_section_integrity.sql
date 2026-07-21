begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_annex_iv_sections_org_package_id_unique'
      and conrelid = 'public.ai_annex_iv_sections'::regclass
  ) then
    alter table public.ai_annex_iv_sections
      add constraint ai_annex_iv_sections_org_package_id_unique
      unique (organization_id, package_id, id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_annex_iv_evidence_package_section_fk'
      and conrelid = 'public.ai_annex_iv_evidence'::regclass
  ) then
    alter table public.ai_annex_iv_evidence
      add constraint ai_annex_iv_evidence_package_section_fk
      foreign key (organization_id, package_id, section_id)
      references public.ai_annex_iv_sections(organization_id, package_id, id)
      on delete cascade;
  end if;
end;
$$;

commit;
