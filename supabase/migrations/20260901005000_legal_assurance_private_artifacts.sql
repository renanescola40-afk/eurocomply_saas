begin;

-- Legal Assurance signed professional artifacts.
-- Repository-side only: this migration does not authorize a Production push or
-- imply that a law-firm partner / signed legal opinion currently exists.

do $preconditions$
begin
  if to_regclass('public.legal_review_artifacts') is null
     or to_regclass('public.legal_review_decisions') is null
     or to_regclass('public.legal_review_requests') is null
     or to_regclass('public.counsel_profiles') is null
     or to_regclass('storage.buckets') is null
     or to_regclass('storage.objects') is null then
    raise exception 'legal assurance private artifact dependency spine is incomplete';
  end if;
end
$preconditions$;

alter table public.legal_review_artifacts
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists original_filename text,
  add column if not exists uploaded_by_counsel_id uuid references public.counsel_profiles(id) on delete restrict;

alter table public.legal_review_artifacts
  drop constraint if exists legal_review_artifacts_storage_bucket_chk,
  drop constraint if exists legal_review_artifacts_storage_path_chk,
  drop constraint if exists legal_review_artifacts_mime_type_chk,
  drop constraint if exists legal_review_artifacts_size_bytes_chk;

alter table public.legal_review_artifacts
  add constraint legal_review_artifacts_storage_bucket_chk
    check (storage_bucket is null or storage_bucket = 'legal-assurance-artifacts') not valid,
  add constraint legal_review_artifacts_storage_path_chk
    check (storage_path is null or char_length(btrim(storage_path)) between 10 and 1024) not valid,
  add constraint legal_review_artifacts_mime_type_chk
    check (mime_type is null or mime_type = 'application/pdf') not valid,
  add constraint legal_review_artifacts_size_bytes_chk
    check (size_bytes is null or size_bytes between 1 and 5242880) not valid;

create unique index if not exists legal_review_artifacts_reference_unique
  on public.legal_review_artifacts(artifact_reference);
create unique index if not exists legal_review_artifacts_storage_object_unique
  on public.legal_review_artifacts(storage_bucket, storage_path)
  where storage_bucket is not null and storage_path is not null;
create index if not exists legal_review_artifacts_counsel_review_idx
  on public.legal_review_artifacts(uploaded_by_counsel_id, review_id, created_at desc)
  where uploaded_by_counsel_id is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-assurance-artifacts',
  'legal-assurance-artifacts',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Browser roles never receive direct object access. Upload and short-lived URL
-- issuance are performed only by the trusted service-role backend after matter
-- authority has been resolved.
drop policy if exists "No direct legal assurance artifact reads" on storage.objects;
drop policy if exists "No direct legal assurance artifact uploads" on storage.objects;
drop policy if exists "No direct legal assurance artifact updates" on storage.objects;
drop policy if exists "No direct legal assurance artifact deletes" on storage.objects;

create policy "No direct legal assurance artifact reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'legal-assurance-artifacts' and false);

create policy "No direct legal assurance artifact uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'legal-assurance-artifacts' and false);

create policy "No direct legal assurance artifact updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'legal-assurance-artifacts' and false)
  with check (bucket_id = 'legal-assurance-artifacts' and false);

create policy "No direct legal assurance artifact deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'legal-assurance-artifacts' and false);

-- A professional decision may reference a signed artifact only when that
-- artifact belongs to the same matter and was uploaded by the same verified
-- Counsel identity that is issuing the decision.
create or replace function app_private.enforce_legal_decision_artifact_reference()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.signed_artifact_reference is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.legal_review_artifacts artifact
    where artifact.review_id = new.review_id
      and artifact.artifact_reference = new.signed_artifact_reference
      and artifact.uploaded_by_counsel_id = new.counsel_id
      and artifact.storage_bucket = 'legal-assurance-artifacts'
      and artifact.storage_path is not null
      and artifact.mime_type = 'application/pdf'
  ) then
    raise exception 'signed legal artifact must belong to the same matter and Counsel';
  end if;

  return new;
end
$$;

revoke all on function app_private.enforce_legal_decision_artifact_reference() from public, anon, authenticated;
grant execute on function app_private.enforce_legal_decision_artifact_reference() to service_role;

drop trigger if exists legal_review_decision_artifact_reference_guard on public.legal_review_decisions;
create trigger legal_review_decision_artifact_reference_guard
before insert on public.legal_review_decisions
for each row execute function app_private.enforce_legal_decision_artifact_reference();

do $postconditions$
declare
  bucket_record record;
  policy_count integer;
  guard_oid oid := to_regprocedure('app_private.enforce_legal_decision_artifact_reference()');
begin
  select id, public, file_size_limit, allowed_mime_types
    into bucket_record
  from storage.buckets
  where id = 'legal-assurance-artifacts';

  if bucket_record.id is null
     or bucket_record.public
     or bucket_record.file_size_limit <> 5242880
     or bucket_record.allowed_mime_types is distinct from array['application/pdf']::text[] then
    raise exception 'legal assurance artifact bucket boundary is not canonical';
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'No direct legal assurance artifact reads',
      'No direct legal assurance artifact uploads',
      'No direct legal assurance artifact updates',
      'No direct legal assurance artifact deletes'
    )
    and roles = array['authenticated']::name[];

  if policy_count <> 4 then
    raise exception 'legal assurance artifact browser-deny policy set is incomplete';
  end if;

  if guard_oid is null
     or has_function_privilege('anon', guard_oid, 'EXECUTE')
     or has_function_privilege('authenticated', guard_oid, 'EXECUTE')
     or not has_function_privilege('service_role', guard_oid, 'EXECUTE') then
    raise exception 'legal assurance artifact decision guard authority is invalid';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.legal_review_decisions'::regclass
      and tgname = 'legal_review_decision_artifact_reference_guard'
      and not tgisinternal
  ) then
    raise exception 'legal assurance decision artifact trigger is missing';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';
commit;
