begin;

do $$
declare
  existing_constraint_name text;
begin
  select constraint_record.conname
  into existing_constraint_name
  from pg_constraint constraint_record
  join pg_class table_record
    on table_record.oid = constraint_record.conrelid
  join pg_namespace namespace_record
    on namespace_record.oid = table_record.relnamespace
  where namespace_record.nspname = 'public'
    and table_record.relname = 'ai_provider_dataset_mitigations'
    and constraint_record.contype = 'f'
    and pg_get_constraintdef(constraint_record.oid) like
      'FOREIGN KEY (organization_id, program_id, dataset_id, assessment_id)%'
  limit 1;

  if existing_constraint_name is not null then
    execute format(
      'alter table public.ai_provider_dataset_mitigations drop constraint %I',
      existing_constraint_name
    );
  end if;
end;
$$;

alter table public.ai_provider_dataset_mitigations
  add constraint ai_provider_dataset_mitigations_assessment_fk
  foreign key (organization_id, program_id, dataset_id, assessment_id)
  references public.ai_provider_dataset_assessments(
    organization_id,
    program_id,
    dataset_id,
    id
  )
  on delete restrict;

commit;
