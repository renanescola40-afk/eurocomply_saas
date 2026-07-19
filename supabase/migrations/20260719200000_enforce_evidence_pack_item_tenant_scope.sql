-- Enforce that every enterprise evidence-pack item belongs to the same
-- organization as the evidence pack it references. The composite foreign key
-- validates existing rows during migration and applies to every future writer.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enterprise_evidence_packs_id_organization_id_key'
      and conrelid = 'public.enterprise_evidence_packs'::regclass
  ) then
    alter table public.enterprise_evidence_packs
      add constraint enterprise_evidence_packs_id_organization_id_key
      unique (id, organization_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enterprise_evidence_pack_items_pack_organization_fkey'
      and conrelid = 'public.enterprise_evidence_pack_items'::regclass
  ) then
    alter table public.enterprise_evidence_pack_items
      add constraint enterprise_evidence_pack_items_pack_organization_fkey
      foreign key (pack_id, organization_id)
      references public.enterprise_evidence_packs (id, organization_id)
      on delete cascade;
  end if;
end
$$;

comment on constraint enterprise_evidence_pack_items_pack_organization_fkey
  on public.enterprise_evidence_pack_items is
  'Requires evidence-pack items to use the referenced evidence pack tenant.';
