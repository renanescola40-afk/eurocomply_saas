#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';

const workDir = join(process.cwd(), 'artifacts', 'ephemeral-restore-smoke');
const rolesPath = join(workDir, 'roles.sql');
const schemaPath = join(workDir, 'schema.sql');
const dataPath = join(workDir, 'data.sql');
const marker = 'risck-ephemeral-restore-smoke-v1';
const isolatedRestoreRole = 'supabase_admin';
const SUPABASE_MANAGED_DATA_EXCLUDES = [
  'storage.buckets_vectors',
  'storage.vector_indexes',
];

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function assertGithubActions() {
  if (env('GITHUB_ACTIONS') !== 'true') {
    throw new Error('Ephemeral restore smoke is restricted to GitHub Actions');
  }
}

function assertLoopback(url) {
  try {
    const parsed = new URL(url);
    if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
      throw new Error('non_loopback');
    }
  } catch {
    throw new Error('Ephemeral restore smoke requires a loopback PostgreSQL URL');
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: options.timeout ?? 15 * 60_000,
  });
}

function sql(url, statement) {
  return String(run('psql', [
    url,
    '--no-psqlrc',
    '--tuples-only',
    '--no-align',
    '--set', 'ON_ERROR_STOP=1',
    '--command', statement,
  ], { capture: true })).trim();
}

function requireLocalDatabase() {
  const url = env('RECOVERY_ISOLATED_DATABASE_URL');
  const container = env('RECOVERY_LOCAL_DB_CONTAINER');
  if (!url || !container) throw new Error('Disposable database environment is incomplete');
  assertLoopback(url);
  return { url, container };
}

function createSyntheticEnterpriseSource(url) {
  sql(url, `
    drop table if exists public.__risck_restore_smoke cascade;
    drop table if exists public.audit_logs cascade;
    drop table if exists public.organization_members cascade;
    drop table if exists public.organizations cascade;

    create table public.organizations (
      id bigint primary key,
      name text not null
    );

    create table public.organization_members (
      id bigint primary key,
      organization_id bigint not null references public.organizations(id),
      user_ref text not null
    );

    create table public.audit_logs (
      id bigint primary key,
      organization_id bigint not null references public.organizations(id),
      action text not null
    );

    alter table public.organizations enable row level security;
    alter table public.organizations force row level security;
    alter table public.organization_members enable row level security;
    alter table public.organization_members force row level security;
    alter table public.audit_logs enable row level security;
    alter table public.audit_logs force row level security;

    create policy "restore smoke organizations deny" on public.organizations for all using (false) with check (false);
    create policy "restore smoke members deny" on public.organization_members for all using (false) with check (false);
    create policy "restore smoke audit deny" on public.audit_logs for all using (false) with check (false);

    create table public.__risck_restore_smoke (
      id integer primary key,
      marker text not null
    );

    insert into public.organizations (id, name) values (1, 'synthetic-enterprise');
    insert into public.organization_members (id, organization_id, user_ref) values (1, 1, 'synthetic-user');
    insert into public.audit_logs (id, organization_id, action) values (1, 1, 'synthetic.restore.smoke');
    insert into public.__risck_restore_smoke (id, marker) values (1, '${marker}');
  `);
}

function dump() {
  assertGithubActions();
  const { url } = requireLocalDatabase();
  mkdirSync(workDir, { recursive: true });
  createSyntheticEnterpriseSource(url);

  run('supabase', ['db', 'dump', '--db-url', url, '--role-only', '--file', rolesPath]);
  run('supabase', ['db', 'dump', '--db-url', url, '--file', schemaPath]);
  run('supabase', [
    'db', 'dump', '--db-url', url,
    '--data-only', '--use-copy',
    '--exclude', SUPABASE_MANAGED_DATA_EXCLUDES[0],
    '--exclude', SUPABASE_MANAGED_DATA_EXCLUDES[1],
    '--file', dataPath,
  ]);

  for (const path of [rolesPath, schemaPath, dataPath]) {
    const contents = readFileSync(path);
    if (contents.byteLength === 0) throw new Error(`Synthetic recovery smoke dump is empty: ${basename(path)}`);
  }

  process.stdout.write('Synthetic Supabase roles/schema/data dumps created from an isolated disposable source.\n');
}

function copyToContainer(container, path) {
  const target = `/tmp/${basename(path)}`;
  run('docker', ['cp', path, `${container}:${target}`]);
  return target;
}

function assertIsolatedRestoreRoleBoundary(container) {
  const status = String(run('docker', [
    'exec', container,
    'psql', '-U', 'postgres', '-d', 'postgres',
    '--no-psqlrc',
    '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1',
    '--command', `select case when target.rolcanlogin and target.rolsuper and not source.rolsuper then 'ok' else 'invalid' end from pg_roles target cross join pg_roles source where target.rolname = '${isolatedRestoreRole}' and source.rolname = 'postgres';`,
  ], { capture: true })).trim();
  if (status !== 'ok') throw new Error('Disposable Supabase restore privilege boundary is invalid');
}

function restore() {
  assertGithubActions();
  const { url, container } = requireLocalDatabase();
  const files = [rolesPath, schemaPath, dataPath];
  for (const path of files) {
    const contents = readFileSync(path);
    if (contents.byteLength === 0) throw new Error(`Synthetic recovery smoke dump is missing or empty: ${basename(path)}`);
  }

  const targets = files.map((path) => copyToContainer(container, path));
  try {
    run('docker', [
      'exec', container,
      'psql', '-U', 'postgres', '-d', 'postgres',
      '--no-psqlrc',
      '--single-transaction',
      '--set', 'ON_ERROR_STOP=1',
      '--file', targets[0],
      '--file', targets[1],
    ]);

    assertIsolatedRestoreRoleBoundary(container);
    run('docker', [
      'exec', container,
      'psql', '-U', isolatedRestoreRole, '-d', 'postgres',
      '--no-psqlrc',
      '--single-transaction',
      '--set', 'ON_ERROR_STOP=1',
      '--command', 'SET session_replication_role = replica;',
      '--file', targets[2],
    ]);

    const observed = sql(url, 'select marker from public.__risck_restore_smoke where id = 1;');
    if (observed !== marker) throw new Error('Synthetic restored row did not match the source marker');

    const rowCounts = sql(url, `
      select concat(
        (select count(*) from public.organizations), ':',
        (select count(*) from public.organization_members), ':',
        (select count(*) from public.audit_logs)
      );
    `);
    if (rowCounts !== '1:1:1') throw new Error(`Synthetic restore lost critical table rows: ${rowCounts}`);

    const rlsCount = Number(sql(url, `
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('organizations','organization_members','audit_logs')
        and c.relrowsecurity
        and c.relforcerowsecurity;
    `));
    if (rlsCount !== 3) throw new Error(`Synthetic restore lost RLS/FORCE RLS on critical tables: ${rlsCount}/3`);

    const policyCount = Number(sql(url, `
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename in ('organizations','organization_members','audit_logs')
        and policyname like 'restore smoke % deny';
    `));
    if (policyCount !== 3) throw new Error(`Synthetic restore lost critical RLS policies: ${policyCount}/3`);

    const authTable = sql(url, "select to_regclass('auth.users') is not null;");
    if (authTable !== 't') throw new Error('Synthetic restore target is missing auth.users');

    process.stdout.write('Synthetic Supabase roles/schema/data restore smoke passed.\n');
  } finally {
    for (const target of targets) {
      try { run('docker', ['exec', container, 'rm', '-f', target]); } catch {}
    }
  }
}

function clean() {
  rmSync(workDir, { recursive: true, force: true });
  process.stdout.write('Synthetic restore smoke files removed.\n');
}

const command = process.argv[2];
try {
  if (command === 'dump') dump();
  else if (command === 'restore') restore();
  else if (command === 'clean') clean();
  else throw new Error('Usage: run-ephemeral-restore-smoke.mjs <dump|restore|clean>');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
