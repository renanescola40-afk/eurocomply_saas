#!/usr/bin/env node
// RISCK COMPLY G1: native PostgreSQL 17 synthetic-only guard for historical migration 20260812225906.
// NEVER connect to remote/production, mutate Supabase projects, or accept a DATABASE_URL.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const { default: pg } = await import(new URL('../../tests/fixtures/p0-postgres-runtime/node_modules/pg/lib/index.js', import.meta.url).href);
const connection = {
  host: '127.0.0.1',
  port: 5432,
  user: 'risck_synthetic',
  password: 'synthetic-local-only',
  database: 'risck_synthetic',
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
  lock_timeout: 7000,
};
const client = new pg.Client(connection);
const report = { schema: 'risck-comply.g1-native-pg17-rls-replay-proof.v1',
  sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  scope: 'new PostgreSQL 17 synthetic database only; no production/QA provider credentials',
  checks: [], runtimeTarget: 'risck_synthetic', productionWrites: false };
const source = readFileSync('supabase/migrations/20260812225906_consolidate_canonical_rls_and_client_grants.sql', 'utf8');
const q = (sql, values) => client.query(sql, values);
const check = async (id, fn) => {
  await fn();
  report.checks.push({ id, result: 'PASS' });
  console.log('PASS', id);
};

try {
  assert.equal(process.env.CIRCLECI, 'true', 'Only run in isolated CircleCI synthetic PG job');
  for (const key of ['DATABASE_URL','DIRECT_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','STRIPE_SECRET_KEY','VERCEL_TOKEN']) {
    assert.equal(process.env[key] ?? '', '', 'Unexpected privileged/remote environment input: ' + key);
  }
  await client.connect();
  const identity = (await q("SELECT current_database() db,current_user usr,current_setting('server_version_num')::int ver,inet_server_addr()::text addr")).rows[0];
  assert.equal(identity.db, 'risck_synthetic');
  assert.equal(identity.usr, 'risck_synthetic');
  assert.ok(identity.ver >= 170000 && identity.ver < 180000, 'Need PostgreSQL 17');
  assert.ok(identity.addr && /^(127\.|::1|10\.|172\.|192\.)/.test(identity.addr), 'Disallow public network database server');
  assert.equal(Number((await q("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n),0,
    'Synthetic fixture database unexpectedly contains existing tables');
  await check('PG17-native-synthetic-boundary', async () => {
    assert.match(source, /canonical RLS policy missing after partial materialization/);
    assert.doesNotMatch(source, /raise exception 'canonical RLS policy missing after consolidation:/);
  });
  await q('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;');
  await q('CREATE TABLE public.organizations(id bigint PRIMARY KEY);');
  await q('CREATE TABLE public.subscriptions(id bigint PRIMARY KEY);');
  await q('ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;');
  await q('ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;');
  await q('CREATE POLICY "Users can view their organizations" ON public.organizations FOR SELECT USING (true);');
  await q('CREATE POLICY "Owners can update organizations" ON public.organizations FOR UPDATE USING (true);');
  await q('CREATE POLICY "Members can view subscriptions" ON public.subscriptions FOR SELECT USING (true);');
  await q('CREATE POLICY "Owners can manage subscriptions" ON public.subscriptions FOR ALL USING (true);');

  await check('historical-legacy-only-policy-state-can-be-consolidated', async () => {
    await q(source);
    const p=(await q("SELECT tablename,policyname FROM pg_policies WHERE schemaname='public'")).rows;
    assert.equal(p.length, 0, 'Legacy policies must be removed; no synthetic default allow');
    const tables=(await q("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relname IN ('subscriptions','organizations')")).rows;
    assert.equal(tables.length, 2);
    assert.ok(tables.every(t => t.relrowsecurity && t.relforcerowsecurity),'RLS/FORCE RLS mandatory');
    const grants=(await q("SELECT table_name,privilege_type FROM information_schema.table_privileges WHERE table_schema='public' AND grantee='authenticated' AND table_name IN ('subscriptions','organizations') ORDER BY 1,2")).rows;
    assert.deepEqual(grants,[{table_name:'organizations',privilege_type:'SELECT'},{table_name:'organizations',privilege_type:'UPDATE'},{table_name:'subscriptions',privilege_type:'SELECT'}]);
  });

  await check('partially-materialized-policy-catalog-must-fail-closed', async () => {
    await q('CREATE POLICY rls_subscriptions_select_member ON public.subscriptions FOR SELECT USING (false);');
    let failed=false;
    try { await q(source); }
    catch (err) {
      failed=true;
      assert.match(String(err.message),/canonical RLS policy missing after partial materialization/);
      await q('ROLLBACK');
    }
    assert.equal(failed,true,'Partial catalog MUST NOT be accepted');
    const p=(await q("SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions'")).rows.map(x=>x.policyname);
    assert.deepEqual(p,['rls_subscriptions_select_member'],'Rejected migration must not remove or weaken existing policy');
    const grants=(await q("SELECT privilege_type FROM information_schema.table_privileges WHERE table_schema='public' AND grantee='authenticated' AND table_name='subscriptions'")).rows.map(x=>x.privilege_type);
    assert.deepEqual(grants,['SELECT'],'Rejected transaction must preserve grants');
  });

  await check('full-canonical-catalog-may-pass-without-permissive-regression', async () => {
    for (const name of ['rls_subscriptions_insert_backend_only','rls_subscriptions_update_backend_only','rls_subscriptions_delete_backend_only']) {
      await q('CREATE POLICY "' + name + '" ON public.subscriptions USING (false);');
    }
    await q(source);
    const p=(await q("SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' ORDER BY policyname")).rows.map(x=>x.policyname);
    assert.deepEqual(p,['rls_subscriptions_delete_backend_only','rls_subscriptions_insert_backend_only','rls_subscriptions_select_member','rls_subscriptions_update_backend_only']);
    assert.ok((await q("SELECT relforcerowsecurity FROM pg_class WHERE oid='public.subscriptions'::regclass")).rows[0].relforcerowsecurity);
  });

  assert.equal(report.checks.length,4);
  console.log('G1_SYNTHETIC_RLS_REPLAY_PASS',JSON.stringify(report));
} catch (err) {
  console.error('G1_SYNTHETIC_RLS_REPLAY_FAIL:', String(err.message ?? err));
  process.exitCode=2;
} finally {
  await client.end().catch(() => {});
}
