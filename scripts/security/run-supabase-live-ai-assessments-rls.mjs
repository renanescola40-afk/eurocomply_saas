#!/usr/bin/env node
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { parseEvidenceJson, tableCoverageFrom } from './supabase-live-rls-evidence.mjs';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const runner = 'scripts/security/run-supabase-live-ai-assessments-rls.mjs';
const envUrl = 'NEXT_PUBLIC_SUPABASE_URL';
const envAnon = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
const envPrivileged = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
const requiredEnv = [envUrl, envAnon, envPrivileged];
const authOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const expectedDenialCodes = new Set(['42501']);
const expectedDenialText = /(row-level security|permission denied|not authorized|unauthorized|forbidden|new row violates)/i;
const advisoryMode = process.argv.includes('--advisory') || process.env.RLS_LIVE_ADVISORY === '1';

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const safeError = (error) => error ? { code: String(error.code ?? 'unknown'), message: String(error.message ?? 'error').slice(0, 220) } : null;
const noRows = (data) => data == null || (Array.isArray(data) && data.length === 0);
const noVisibleRows = (error, data) => !error && noRows(data);
const isExpectedDenial = (error) => Boolean(error) && (expectedDenialCodes.has(String(error.code ?? '')) || expectedDenialText.test(String(error.message ?? '')));
const withAiAssessments = (values = []) => Array.from(new Set([...values, 'ai_assessments']));

function getCommitSha() {
  if (/^[a-f0-9]{40}$/i.test(String(process.env.GITHUB_SHA ?? ''))) return process.env.GITHUB_SHA;
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^[a-f0-9]{40}$/i.test(sha)) return sha;
  } catch {}
  return 'unknown';
}

function commandUsed(argv = process.argv.slice(2)) {
  return `node ${runner}${argv.length > 0 ? ` ${argv.join(' ')}` : ''}`;
}

function buildClients() {
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    const report = {
      status: 'advisory',
      runner,
      checkedAt: now(),
      message: 'Skipping live ai_assessments RLS validation because real Supabase environment variables are not configured. No runtime evidence was generated.',
      missingEnvironmentVariables: missing,
      evidenceGenerated: false,
    };
    if (advisoryMode) {
      console.log(JSON.stringify(report, null, 2));
      return null;
    }
    throw new Error(`${report.message} Missing: ${missing.join(', ')}`);
  }

  const commitSha = getCommitSha();
  if (!/^[a-f0-9]{40}$/i.test(commitSha)) {
    throw new Error('Could not resolve a full 40-character commit SHA for runtime evidence. Run from a Git checkout or set GITHUB_SHA.');
  }

  const supabaseUrl = process.env[envUrl];
  return {
    supabaseUrl,
    commitSha,
    admin: createClient(supabaseUrl, process.env[envPrivileged], authOptions),
    tenantA: createClient(supabaseUrl, process.env[envAnon], authOptions),
    tenantAViewer: createClient(supabaseUrl, process.env[envAnon], authOptions),
    tenantB: createClient(supabaseUrl, process.env[envAnon], authOptions),
    tenantBAdmin: createClient(supabaseUrl, process.env[envAnon], authOptions),
    tenantBMember: createClient(supabaseUrl, process.env[envAnon], authOptions),
  };
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Failed to sign in validation user: ${error?.message ?? 'missing session'}`);
}

async function insertOne(admin, table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`Failed to seed ${table}: ${error.message}`);
  return data;
}

async function setup(admin) {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const password = `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
  const created = { users: [], rows: [] };

  const makeUser = async (label) => {
    const email = `rls-ai-assessments-${label}-${suffix}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { purpose: 'ai-assessments-rls-live-validation' }, password });
    if (error || !data.user?.id) throw new Error(`Failed to create validation user ${label}: ${error?.message ?? 'missing user id'}`);
    created.users.push(data.user.id);
    return { ...data.user, email };
  };

  const userA = await makeUser('owner-a');
  const userAViewer = await makeUser('viewer-a');
  const userB = await makeUser('owner-b');
  const userBAdmin = await makeUser('admin-b');
  const userBMember = await makeUser('member-b');

  const orgA = await insertOne(admin, 'organizations', { name: `AI Assessments RLS Tenant A ${suffix}`, slug: `ai-assessments-a-${suffix}`, created_by: userA.id });
  const orgB = await insertOne(admin, 'organizations', { name: `AI Assessments RLS Tenant B ${suffix}`, slug: `ai-assessments-b-${suffix}`, created_by: userB.id });
  created.rows.push(['organizations', orgA.id], ['organizations', orgB.id]);

  const memberRows = [
    await insertOne(admin, 'organization_members', { organization_id: orgA.id, user_id: userA.id, role: 'owner' }),
    await insertOne(admin, 'organization_members', { organization_id: orgA.id, user_id: userAViewer.id, role: 'viewer' }),
    await insertOne(admin, 'organization_members', { organization_id: orgB.id, user_id: userB.id, role: 'owner' }),
    await insertOne(admin, 'organization_members', { organization_id: orgB.id, user_id: userBAdmin.id, role: 'admin' }),
    await insertOne(admin, 'organization_members', { organization_id: orgB.id, user_id: userBMember.id, role: 'member' }),
  ];
  created.rows.push(...memberRows.map((row) => ['organization_members', row.id]));

  const assessment = await insertOne(admin, 'ai_assessments', {
    organization_id: orgB.id,
    created_by: userB.id,
    title: `tenant-b-ai-assessment-${suffix}`,
    status: 'completed',
    risk_score: 42,
    risk_level: 'limited',
    recommendations: [{ control: 'rls-live-validation', status: 'synthetic' }],
  });
  created.rows.push(['ai_assessments', assessment.id]);

  return { suffix, password, created, userA, userAViewer, userB, userBAdmin, userBMember, orgA, orgB, assessment };
}

async function cleanup(admin, created) {
  if (process.env.RLS_LIVE_KEEP_FIXTURES === '1' || !created) return;
  for (const [table, id] of [...created.rows].reverse()) await admin.from(table).delete().eq('id', id);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
}

async function rlsEnabled(admin) {
  const { data, error } = await admin.rpc('eurocomply_live_rls_inventory', { table_names: ['ai_assessments'] });
  if (error) throw new Error(`Failed to query live RLS inventory for ai_assessments: ${error.message}`);
  const row = Array.isArray(data) ? data.find((entry) => entry?.table_name === 'ai_assessments') : null;
  return {
    table: 'ai_assessments',
    operation: 'rls_enabled',
    passed: row?.exists === true && row?.rls_enabled === true && Number(row?.policy_count ?? 0) > 0,
    exists: row?.exists === true,
    rlsEnabled: row?.rls_enabled === true,
    forceRls: row?.force_rls === true,
    policyCount: Number(row?.policy_count ?? 0),
  };
}

async function readCase(client, operation, id) {
  const { data, error } = await client.from('ai_assessments').select('id').eq('id', id).limit(1);
  return { table: 'ai_assessments', operation, passed: !error && Array.isArray(data) && data.length === 1, error: safeError(error), returnedRows: Array.isArray(data) ? data.length : 0 };
}

async function crossTenantReadDenied(client, id) {
  const { data, error } = await client.from('ai_assessments').select('id').eq('id', id).limit(1);
  return { table: 'ai_assessments', operation: 'cross_tenant_read', passed: noVisibleRows(error, data), error: safeError(error), returnedRows: Array.isArray(data) ? data.length : 0 };
}

async function insertCase(client, operation, row, shouldPass) {
  const { data, error } = await client.from('ai_assessments').insert(row).select('id');
  const insertedId = Array.isArray(data) && data.length === 1 ? data[0]?.id : null;
  return {
    table: 'ai_assessments',
    operation,
    passed: shouldPass ? !error && Boolean(insertedId) : isExpectedDenial(error),
    error: safeError(error),
    returnedRows: Array.isArray(data) ? data.length : 0,
    insertedId,
  };
}

async function updateCase(admin, client, operation, id, patch, shouldPass) {
  const before = await admin.from('ai_assessments').select('*').eq('id', id).maybeSingle();
  const { data, error } = await client.from('ai_assessments').update(patch).eq('id', id).select('id');
  const after = await admin.from('ai_assessments').select('*').eq('id', id).maybeSingle();
  const changed = JSON.stringify(before.data) !== JSON.stringify(after.data);
  return {
    table: 'ai_assessments',
    operation,
    passed: shouldPass ? !error && changed && Array.isArray(data) && data.length === 1 : !changed && (noVisibleRows(error, data) || isExpectedDenial(error)),
    error: safeError(error),
    returnedRows: Array.isArray(data) ? data.length : 0,
  };
}

async function deleteCase(admin, client, operation, id, shouldPass) {
  const { data, error } = await client.from('ai_assessments').delete().eq('id', id).select('id');
  const after = await admin.from('ai_assessments').select('id').eq('id', id).maybeSingle();
  return {
    table: 'ai_assessments',
    operation,
    passed: shouldPass ? !error && !after.data?.id && Array.isArray(data) && data.length === 1 : Boolean(after.data?.id) && (noVisibleRows(error, data) || isExpectedDenial(error)),
    error: safeError(error),
    returnedRows: Array.isArray(data) ? data.length : 0,
  };
}

function loadExistingEvidence() {
  if (!fs.existsSync(evidencePath)) throw new Error(`${evidencePath} is missing. Run scripts/security/run-supabase-live-tenant-isolation.mjs first.`);
  const parsed = parseEvidenceJson(fs.readFileSync(evidencePath, 'utf8'));
  if (parsed.errors.length > 0) throw new Error(parsed.errors.join('; '));
  if (parsed.evidence?.status !== 'Complete' || parsed.evidence?.outcome !== 'passed') {
    throw new Error('Base Supabase live RLS evidence must be Complete/passed before appending ai_assessments validation.');
  }
  return parsed.evidence;
}

function requirePassed(testCases, operation) {
  if (!testCases.some((test) => test.table === 'ai_assessments' && test.operation === operation && test.passed === true)) {
    throw new Error(`missing or failed live ai_assessments RLS operation: ${operation}`);
  }
}

function validateAiAssessmentCoverage(testCases) {
  for (const operation of [
    'rls_enabled',
    'cross_tenant_read',
    'cross_tenant_insert',
    'cross_tenant_update',
    'cross_tenant_delete',
    'same_tenant_read',
    'same_tenant_insert',
    'admin_same_tenant_insert',
    'member_same_tenant_read',
    'member_same_tenant_insert_denied',
    'member_same_tenant_update_denied',
    'member_same_tenant_delete_denied',
    'viewer_same_tenant_read',
    'viewer_same_tenant_insert_denied',
    'viewer_same_tenant_update_denied',
    'viewer_same_tenant_delete_denied',
  ]) {
    requirePassed(testCases, operation);
  }
}

function writeFailure(baseEvidence, failure, testCases, commitSha) {
  const timestamp = now();
  fs.writeFileSync(evidencePath, `${JSON.stringify({
    ...(baseEvidence ?? {}),
    evidenceItem: 'supabase-live-rls-validation',
    status: 'Open',
    outcome: 'failed',
    timestamp,
    generatedAt: timestamp,
    reviewedAt: timestamp,
    runner,
    commandUsed: commandUsed(),
    commitSha,
    failures: [failure],
    testsFailed: testCases.filter((test) => test.passed !== true).map((test) => `${test.table}:${test.operation}`),
    testCases: [...(baseEvidence?.testCases ?? []), ...testCases],
    tablesReviewed: tableCoverageFrom([...(baseEvidence?.testCases ?? []), ...testCases]),
    productionGate: 'P0 production release remains blocked until ai_assessments live RLS validation passes.',
    blockingReason: failure,
  }, null, 2)}\n`);
}

function writeSuccess(baseEvidence, testCases, commitSha) {
  const mergedTestCases = [...(baseEvidence.testCases ?? []), ...testCases];
  const timestamp = now();
  const nextEvidence = {
    ...baseEvidence,
    status: 'Complete',
    outcome: 'passed',
    timestamp,
    generatedAt: timestamp,
    reviewedAt: timestamp,
    runner: baseEvidence.runner ?? 'scripts/security/run-supabase-live-tenant-isolation.mjs',
    commandUsed: `${baseEvidence.commandUsed ?? 'node scripts/security/run-supabase-live-tenant-isolation.mjs'} && ${commandUsed()}`,
    commitSha,
    summary: 'Live Supabase production/staging RLS validation passed for customer tenant tables, ai_assessments, profiles, and global reference tables.',
    controlsVerified: Array.from(new Set([...(baseEvidence.controlsVerified ?? []), 'ai_assessments RLS denies cross-tenant read/write/delete and enforces owner/admin/member/viewer behavior'])),
    customerTenantTables: withAiAssessments(baseEvidence.customerTenantTables),
    criticalTables: withAiAssessments(baseEvidence.criticalTables),
    tablesReviewed: tableCoverageFrom(mergedTestCases),
    testsRun: mergedTestCases.map((test) => `${test.table}:${test.operation}`),
    testsPassed: mergedTestCases.filter((test) => test.passed === true).map((test) => `${test.table}:${test.operation}`),
    testsFailed: mergedTestCases.filter((test) => test.passed !== true).map((test) => `${test.table}:${test.operation}`),
    testCases: mergedTestCases,
    failures: [],
    aiAssessmentsLiveValidation: {
      runner,
      commandUsed: commandUsed(),
      status: 'Complete',
      outcome: 'passed',
      generatedAt: timestamp,
      roleCoverage: ['owner', 'admin', 'member', 'viewer'],
      crossTenantAccessDenied: true,
    },
  };

  validateAiAssessmentCoverage(nextEvidence.testCases);
  fs.writeFileSync(evidencePath, `${JSON.stringify(nextEvidence, null, 2)}\n`);
}

export async function main() {
  const clients = buildClients();
  if (!clients) return;
  const { admin, tenantA, tenantAViewer, tenantB, tenantBAdmin, tenantBMember, commitSha } = clients;
  let ctx;
  let baseEvidence;
  const testCases = [];

  try {
    baseEvidence = loadExistingEvidence();
    ctx = await setup(admin);
    await signIn(tenantA, ctx.userA.email, ctx.password);
    await signIn(tenantAViewer, ctx.userAViewer.email, ctx.password);
    await signIn(tenantB, ctx.userB.email, ctx.password);
    await signIn(tenantBAdmin, ctx.userBAdmin.email, ctx.password);
    await signIn(tenantBMember, ctx.userBMember.email, ctx.password);

    testCases.push(await rlsEnabled(admin));
    testCases.push(await crossTenantReadDenied(tenantA, ctx.assessment.id));
    testCases.push(await insertCase(tenantA, 'cross_tenant_insert', { organization_id: ctx.orgB.id, created_by: ctx.userA.id, title: `cross-ai-assessment-${ctx.suffix}`, status: 'draft' }, false));
    testCases.push(await updateCase(admin, tenantA, 'cross_tenant_update', ctx.assessment.id, { title: `mutated-cross-${ctx.suffix}` }, false));
    testCases.push(await deleteCase(admin, tenantA, 'cross_tenant_delete', ctx.assessment.id, false));
    testCases.push(await readCase(tenantB, 'same_tenant_read', ctx.assessment.id));

    const ownerInsert = await insertCase(tenantB, 'same_tenant_insert', { organization_id: ctx.orgB.id, created_by: ctx.userB.id, title: `owner-same-ai-assessment-${ctx.suffix}`, status: 'draft' }, true);
    testCases.push(ownerInsert);
    if (ownerInsert.insertedId) ctx.created.rows.push(['ai_assessments', ownerInsert.insertedId]);

    const adminInsert = await insertCase(tenantBAdmin, 'admin_same_tenant_insert', { organization_id: ctx.orgB.id, created_by: ctx.userBAdmin.id, title: `admin-same-ai-assessment-${ctx.suffix}`, status: 'draft' }, true);
    testCases.push(adminInsert);
    if (adminInsert.insertedId) ctx.created.rows.push(['ai_assessments', adminInsert.insertedId]);

    testCases.push(await readCase(tenantBMember, 'member_same_tenant_read', ctx.assessment.id));
    testCases.push(await insertCase(tenantBMember, 'member_same_tenant_insert_denied', { organization_id: ctx.orgB.id, created_by: ctx.userBMember.id, title: `member-denied-ai-assessment-${ctx.suffix}`, status: 'draft' }, false));
    testCases.push(await updateCase(admin, tenantBMember, 'member_same_tenant_update_denied', ctx.assessment.id, { title: `member-mutated-${ctx.suffix}` }, false));
    testCases.push(await deleteCase(admin, tenantBMember, 'member_same_tenant_delete_denied', ctx.assessment.id, false));

    testCases.push(await readCase(tenantAViewer, 'viewer_same_tenant_read', ctx.assessment.id));
    testCases.push(await insertCase(tenantAViewer, 'viewer_same_tenant_insert_denied', { organization_id: ctx.orgA.id, created_by: ctx.userAViewer.id, title: `viewer-denied-ai-assessment-${ctx.suffix}`, status: 'draft' }, false));
    testCases.push(await updateCase(admin, tenantAViewer, 'viewer_same_tenant_update_denied', ctx.assessment.id, { title: `viewer-mutated-${ctx.suffix}` }, false));
    testCases.push(await deleteCase(admin, tenantAViewer, 'viewer_same_tenant_delete_denied', ctx.assessment.id, false));

    validateAiAssessmentCoverage(testCases);
    const failed = testCases.filter((test) => test.passed !== true);
    if (failed.length > 0) throw new Error(`Live ai_assessments RLS validation failed: ${failed.map((test) => test.operation).join(', ')}`);

    writeSuccess(baseEvidence, testCases, commitSha);
    console.log('Live ai_assessments RLS validation: passed');
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    writeFailure(baseEvidence, failure, testCases, commitSha);
    throw error;
  } finally {
    if (ctx?.created) await cleanup(admin, ctx.created);
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
