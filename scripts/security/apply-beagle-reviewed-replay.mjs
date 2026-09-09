#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.supabase.com/v1';
const PROJECT_REF = /^[a-z0-9]{20}$/;
const FULL_SHA = /^[a-f0-9]{40}$/;
const MAX_CHUNK_BYTES = 190_000;

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function required(name) {
  const value = env(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertTargetBoundary() {
  const targetRef = required('BEAGLE_TARGET_PROJECT_REF');
  const productionRef = required('PRODUCTION_PROJECT_REF');
  const expectedTargetRef = required('EXPECTED_BEAGLE_PROJECT_REF');

  for (const [label, value] of [
    ['target', targetRef],
    ['production', productionRef],
    ['expected_target', expectedTargetRef],
  ]) {
    if (!PROJECT_REF.test(value)) fail(`${label}_project_ref_invalid`);
  }

  if (targetRef !== expectedTargetRef) fail('beagle_target_ref_mismatch');
  if (targetRef === productionRef) fail('production_target_forbidden');

  return { targetRef, productionRef };
}

function parseReplayFiles(bundleText) {
  const pattern = /^-- BEGIN REVIEWED REPLAY FILE: ([^\r\n]+)\r?\n([\s\S]*?)^-- END REVIEWED REPLAY FILE: \1\r?$/gm;
  const files = [];
  for (const match of bundleText.matchAll(pattern)) {
    files.push({ name: match[1].trim(), sql: match[2] });
  }
  return files;
}

function chunkReplayFiles(files) {
  const chunks = [];
  let current = [];
  let currentBytes = 0;

  for (const file of files) {
    const framed = `\n-- BEAGLE REMOTE REPLAY: ${file.name}\n${file.sql}\n`;
    const bytes = Buffer.byteLength(framed);
    if (current.length && currentBytes + bytes > MAX_CHUNK_BYTES) {
      chunks.push(current.join(''));
      current = [];
      currentBytes = 0;
    }
    current.push(framed);
    currentBytes += bytes;
  }
  if (current.length) chunks.push(current.join(''));
  return chunks;
}

function loadAndVerifyBundle() {
  const bundlePath = required('RECOVERY_BEAGLE_REPLAY_BUNDLE_PATH');
  const manifestPath = required('RECOVERY_BEAGLE_REPLAY_MANIFEST_PATH');
  const expectedSha = required('EXPECTED_HEAD_SHA');
  if (!FULL_SHA.test(expectedSha)) fail('expected_head_sha_invalid');

  const bundleBytes = readFileSync(bundlePath);
  const bundleText = bundleBytes.toString('utf8');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const digest = sha256(bundleBytes);

  if (manifest.subjectSha !== expectedSha) fail('bundle_exact_sha_mismatch');
  if (manifest.bundleSha256 !== digest) fail('bundle_digest_mismatch');
  if (manifest.containsSeedData !== false) fail('bundle_seed_boundary_not_closed');
  if (manifest.containsProductionRows !== false) fail('bundle_production_rows_boundary_not_closed');
  if (manifest.productionWriteAuthorized !== false) fail('bundle_production_write_boundary_not_closed');
  if (manifest.intendedTarget !== 'isolated-beagle-pentest-supabase-only') fail('bundle_target_boundary_invalid');
  if (manifest.canonicalMigrationHistory !== false) fail('bundle_history_boundary_invalid');

  const files = parseReplayFiles(bundleText);
  if (files.length !== Number(manifest.replayFileCount)) fail('bundle_replay_file_count_mismatch');
  if (!files.length) fail('bundle_replay_empty');

  return { bundlePath, manifestPath, bundleBytes, manifest, files, digest, expectedSha };
}

async function request(targetRef, query, label) {
  const token = required('SUPABASE_ACCESS_TOKEN');
  const response = await fetch(`${API}/projects/${targetRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await response.text();
  if (!response.ok) {
    let diagnostic = '';
    try {
      const parsed = JSON.parse(text);
      diagnostic = String(parsed?.message ?? parsed?.error ?? parsed?.code ?? '').replace(/\s+/g, ' ').slice(0, 320);
    } catch {
      diagnostic = `http_${response.status}`;
    }
    throw new Error(`${label}_failed_${response.status}${diagnostic ? `_${diagnostic}` : ''}`);
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}_invalid_json`);
  }
}

function cleanupSql() {
  return `
begin;
do $cleanup_storage_policies$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end
$cleanup_storage_policies$;

drop schema if exists app_private cascade;
drop schema if exists public cascade;
create schema public;
grant all on schema public to postgres;
grant usage on schema public to anon, authenticated, service_role;
delete from supabase_migrations.schema_migrations;
commit;
`;
}

function postconditionSql() {
  return `
do $beagle_remote_postconditions$
declare
  missing integer;
  rls_missing integer;
  storage_policy_count integer;
  foreign_server_count integer;
  foreign_table_count integer;
begin
  if (select count(*) from auth.users) <> 0 then
    raise exception 'beagle target unexpectedly contains auth users';
  end if;

  if (select count(*) from supabase_migrations.schema_migrations) <> 0 then
    raise exception 'beagle schema-only replay unexpectedly wrote canonical migration history';
  end if;

  select count(*) into missing
  from (values
    ('organizations'),
    ('organization_members'),
    ('audit_logs'),
    ('subscriptions'),
    ('ai_systems'),
    ('enterprise_contracts'),
    ('enterprise_identity_connections'),
    ('evidence_items'),
    ('ai_qms_decisions')
  ) required(table_name)
  where to_regclass('public.' || required.table_name) is null;
  if missing <> 0 then
    raise exception 'representative Beagle schema objects missing: %', missing;
  end if;

  select count(*) into rls_missing
  from (values
    ('organizations'),
    ('organization_members'),
    ('audit_logs')
  ) required(table_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = required.table_name
      and c.relrowsecurity
      and c.relforcerowsecurity
  );
  if rls_missing <> 0 then
    raise exception 'representative Beagle tables missing RLS/FORCE RLS: %', rls_missing;
  end if;

  if to_regprocedure('public.enterprise_member_can_read(uuid)') is not null
     or to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null then
    raise exception 'private membership helpers remain exposed in public';
  end if;

  if to_regprocedure('app_private.enterprise_member_can_read(uuid)') is null
     or to_regprocedure('app_private.enterprise_member_can_manage(uuid)') is null then
    raise exception 'private membership helpers missing from app_private';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'compliance-documents' and public = false
  ) then
    raise exception 'private compliance-documents bucket missing';
  end if;

  select count(*) into storage_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and (
      coalesce(qual, '') like '%compliance-documents%'
      or coalesce(with_check, '') like '%compliance-documents%'
    );
  if storage_policy_count < 2 then
    raise exception 'compliance-documents storage policies incomplete';
  end if;

  select count(*) into foreign_server_count from pg_foreign_server;
  select count(*) into foreign_table_count from information_schema.foreign_tables;
  if foreign_server_count <> 0 or foreign_table_count <> 0 then
    raise exception 'external database binding detected in isolated Beagle target';
  end if;
end
$beagle_remote_postconditions$;

select json_build_object(
  'public_tables', (select count(*)::int from pg_tables where schemaname = 'public'),
  'public_functions', (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'public_policies', (select count(*)::int from pg_policies where schemaname = 'public'),
  'storage_policies', (select count(*)::int from pg_policies where schemaname = 'storage'),
  'auth_users', (select count(*)::int from auth.users),
  'migration_rows', (select count(*)::int from supabase_migrations.schema_migrations),
  'private_membership_helpers', (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('enterprise_member_can_read','enterprise_member_can_manage'))
) as beagle_postconditions;
`;
}

async function main() {
  const { targetRef, productionRef } = assertTargetBoundary();
  const bundle = loadAndVerifyBundle();
  const chunks = chunkReplayFiles(bundle.files);
  if (!chunks.length) fail('replay_chunking_empty');

  // Access to SUPABASE_ACCESS_TOKEN occurs only after the fail-closed target and
  // artifact boundaries above have passed.
  required('SUPABASE_ACCESS_TOKEN');

  process.stdout.write(`Beagle target boundary verified: ${targetRef}\n`);
  process.stdout.write(`Production target forbidden: ${productionRef}\n`);
  process.stdout.write(`Reviewed replay files: ${bundle.files.length}; chunks: ${chunks.length}\n`);

  await request(targetRef, cleanupSql(), 'isolated_cleanup');

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    process.stdout.write(`Applying reviewed replay chunk ${index + 1}/${chunks.length} (${Buffer.byteLength(chunk)} bytes)\n`);
    await request(targetRef, chunk, `replay_chunk_${index + 1}`);
  }

  const postconditions = await request(targetRef, postconditionSql(), 'beagle_postconditions');
  const evidencePath = required('BEAGLE_REMOTE_REPLAY_EVIDENCE_PATH');
  const evidence = {
    schema: 'risck-comply.beagle-remote-reviewed-replay.v1',
    generatedAt: new Date().toISOString(),
    subjectSha: bundle.expectedSha,
    targetProjectRef: targetRef,
    productionProjectRef: productionRef,
    productionWriteAuthorized: false,
    bundleSha256: bundle.digest,
    replayFileCount: bundle.files.length,
    chunkCount: chunks.length,
    containsSeedData: false,
    containsProductionRows: false,
    canonicalMigrationHistory: false,
    postconditionsPassed: true,
    providerResponse: postconditions,
  };
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  process.stdout.write('Beagle isolated remote replay and postconditions: PASS\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
