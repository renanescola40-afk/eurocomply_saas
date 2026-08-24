#!/usr/bin/env node

import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

import {
  backendOwnedTables,
  buildEvidencePayload,
  customerTenantTables,
  globalReferenceTables,
  requiredBackendWriteDenyOperations,
  requiredGlobalReferenceOperations,
  requiredViewerAdminDenyOperations,
  sameTenantWritableTables,
  tableCoverageFrom,
  validatePassingEvidence,
} from './supabase-live-rls-evidence.mjs';
import { validateHorizontalIsolationEvidence } from './supabase-horizontal-rls-evidence.mjs';
import { cleanupV20SyntheticFixture, grantBoundedV20CommercialAuthority } from './supabase-v20-live-fixtures.mjs';

const evidencePath = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const runner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
const authOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const expectedDenial = /(row-level security|permission denied|not authorized|unauthorized|forbidden|new row violates|schema cache|could not find the table|function .* does not exist)/i;
const forceRlsTables = new Set([
  'ai_systems', 'compliance_tasks', 'documents', 'risks', 'vendors', 'audit_logs',
  'invitations', 'onboarding_activation_runs', 'monitoring_preferences', 'ai_assessments', 'evidence_items',
]);
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function assert(value, message) { if (!value) throw new Error(message); }
function safeError(error) {
  return error ? { code: String(error.code ?? 'unknown').slice(0, 48), message: String(error.message ?? 'error').slice(0, 220) } : null;
}
function denied(error) { return Boolean(error) && (String(error.code ?? '') === '42501' || expectedDenial.test(String(error.message ?? ''))); }
function noRows(data) { return data == null || (Array.isArray(data) && data.length === 0); }
function client(url, key) { return createClient(url, key, authOptions); }
function requireEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}
function commitSha() {
  const github = String(process.env.GITHUB_SHA ?? '').trim().toLowerCase();
  if (/^[a-f0-9]{40}$/.test(github)) return github;
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().toLowerCase();
    if (/^[a-f0-9]{40}$/.test(sha)) return sha;
  } catch {}
  return 'unknown';
}
function writeEvidence(value) {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function createUser(admin, label, suffix, password, created) {
  const email = `rls-v20-${label}-${suffix}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { purpose: 'post-v20-live-rls-proof' } });
  if (error || !data.user?.id) throw new Error(`${label}_user_create_failed:${error?.message ?? 'missing_id'}`);
  created.users.push(data.user.id);
  return { id: data.user.id, email };
}
async function signIn(supabase, identity, password, label) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: identity.email, password });
  if (error || !data.session) throw new Error(`${label}_sign_in_failed:${error?.message ?? 'missing_session'}`);
}
function missingColumn(error, table) {
  const message = String(error?.message ?? '');
  const cache = message.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
  if (cache?.[2] === table) return cache[1];
  const sql = message.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i);
  return sql?.[2] === table ? sql[1] : null;
}
async function insertAdaptive(supabase, table, input, select = 'id', single = false) {
  let row = { ...input };
  const removedMissingColumns = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const query = supabase.from(table).insert(row).select(select);
    const result = single ? await query.single() : await query;
    if (!result.error) return { ...result, removedMissingColumns };
    const column = missingColumn(result.error, table);
    if (!column || !Object.hasOwn(row, column)) return { ...result, removedMissingColumns };
    delete row[column];
    removedMissingColumns.push(column);
  }
  return { data: null, error: new Error(`${table}_adaptive_insert_exhausted`), removedMissingColumns };
}
async function seed(admin, table, row, created, label = table) {
  const { data, error } = await insertAdaptive(admin, table, row, '*', true);
  if (error || !data?.id) throw new Error(`${label}_seed_failed:${error?.message ?? 'missing_id'}`);
  created.rows.push([table, data.id]);
  return data;
}
async function seedProfile(admin, identity, created) {
  const { data, error } = await admin.from('profiles').upsert({ id: identity.id, full_name: `RLS ${identity.email}`, avatar_url: null }, { onConflict: 'id' }).select('*').single();
  if (error || !data?.id) throw new Error(`profile_seed_failed:${error?.message ?? 'missing_id'}`);
  created.rows.push(['profiles', data.id]);
  return data;
}
async function inventory(admin, names) {
  const { data, error } = await admin.rpc('eurocomply_live_rls_inventory', { table_names: names });
  if (error || !Array.isArray(data)) throw new Error(`inventory_failed:${error?.message ?? 'missing_data'}`);
  return data;
}
function rlsTest(table, rows) {
  const item = rows.find((row) => row?.table_name === table);
  const requireForce = forceRlsTables.has(table);
  return {
    table, operation: 'rls_enabled',
    passed: item?.exists === true && item?.rls_enabled === true && Number(item?.policy_count ?? 0) > 0 && (!requireForce || item?.force_rls === true),
    exists: item?.exists === true, rlsEnabled: item?.rls_enabled === true, forceRls: item?.force_rls === true,
    policyCount: Number(item?.policy_count ?? 0),
  };
}
async function readAllowed(supabase, table, id) {
  const { data, error } = await supabase.from(table).select('id').eq('id', id).limit(1);
  return { passed: !error && Array.isArray(data) && data.length === 1, returnedRows: Array.isArray(data) ? data.length : 0, error: safeError(error) };
}
async function readDenied(supabase, table, id) {
  const { data, error } = await supabase.from(table).select('id').eq('id', id).limit(1);
  return { passed: denied(error) || (!error && noRows(data)), returnedRows: Array.isArray(data) ? data.length : 0, error: safeError(error) };
}
async function insertAllowed(supabase, table, row) {
  const { data, error, removedMissingColumns } = await insertAdaptive(supabase, table, row);
  const insertedId = Array.isArray(data) && data.length === 1 ? data[0]?.id : null;
  return { passed: !error && Boolean(insertedId), insertedId, returnedRows: Array.isArray(data) ? data.length : 0, removedMissingColumns, error: safeError(error) };
}
async function insertDenied(supabase, table, row) {
  const { data, error, removedMissingColumns } = await insertAdaptive(supabase, table, row);
  return {
    passed: denied(error), returnedRows: Array.isArray(data) ? data.length : 0,
    denialMode: denied(error) ? 'rls_or_permission_error' : 'unexpected', removedMissingColumns, error: safeError(error),
  };
}
async function updateDenied(admin, supabase, table, id, patch) {
  const before = await admin.from(table).select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('id');
  const after = await admin.from(table).select('*').eq('id', id).maybeSingle();
  const unchanged = JSON.stringify(before.data) === JSON.stringify(after.data);
  return { passed: unchanged && (denied(error) || (!error && noRows(data))), returnedRows: Array.isArray(data) ? data.length : 0, unchangedAfterAttempt: unchanged, error: safeError(error) };
}
async function deleteDenied(admin, supabase, table, id) {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  const after = await admin.from(table).select('id').eq('id', id).maybeSingle();
  return { passed: Boolean(after.data?.id) && (denied(error) || (!error && noRows(data))), returnedRows: Array.isArray(data) ? data.length : 0, rowStillExists: Boolean(after.data?.id), error: safeError(error) };
}

async function setup(admin, created) {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const password = `Rls!${crypto.randomBytes(18).toString('base64url')}9aA`;
  const user = {};
  for (const label of ['ownerA', 'viewerA', 'candidateA', 'ownerB', 'adminB', 'memberB', 'unlicensed']) {
    user[label] = await createUser(admin, label, suffix, password, created);
  }
  const org = {};
  for (const [key, owner, slug] of [
    ['A', user.ownerA, 'a'], ['B', user.ownerB, 'b'], ['target', user.ownerB, 'target'], ['U', user.unlicensed, 'u'],
  ]) {
    org[key] = await seed(admin, 'organizations', { name: `RLS V20 ${key} ${suffix}`, slug: `rls-v20-${slug}-${suffix}`, created_by: owner.id }, created, `org_${key}`);
    created.organizations.push(org[key].id);
  }
  const member = {};
  for (const [key, organization, identity, role, seat] of [
    ['ownerA', org.A, user.ownerA, 'owner', 'full'], ['viewerA', org.A, user.viewerA, 'viewer', 'viewer'],
    ['ownerB', org.B, user.ownerB, 'owner', 'full'], ['adminB', org.B, user.adminB, 'admin', 'full'],
    ['memberB', org.B, user.memberB, 'member', 'participant'], ['unlicensed', org.U, user.unlicensed, 'owner', 'full'],
  ]) member[key] = await seed(admin, 'organization_members', { organization_id: organization.id, user_id: identity.id, role, seat_type: seat, status: 'active' }, created, `member_${key}`);

  await grantBoundedV20CommercialAuthority(admin, org.A.id, `A-${suffix}`);
  await grantBoundedV20CommercialAuthority(admin, org.B.id, `B-${suffix}`);
  const profileB = await seedProfile(admin, user.ownerB, created);
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  const seeds = {
    organizations: org.B,
    organization_members: member.ownerB,
    profiles: profileB,
    ai_systems: await seed(admin, 'ai_systems', { organization_id: org.B.id, name: `AI ${suffix}`, use_case: 'RLS proof', created_by: user.ownerB.id }, created),
    compliance_tasks: await seed(admin, 'compliance_tasks', { organization_id: org.B.id, created_by: user.ownerB.id, assigned_to: user.ownerB.id, title: `Task ${suffix}`, category: 'general' }, created),
    documents: await seed(admin, 'documents', { organization_id: org.B.id, uploaded_by: user.ownerB.id, name: `Doc ${suffix}`, category: 'general', storage_path: `${org.B.id}/doc-${suffix}.txt` }, created),
    risks: await seed(admin, 'risks', { organization_id: org.B.id, created_by: user.ownerB.id, owner_user_id: user.ownerB.id, title: `Risk ${suffix}`, category: 'general' }, created),
    vendors: await seed(admin, 'vendors', { organization_id: org.B.id, created_by: user.ownerB.id, name: `Vendor ${suffix}`, category: 'general' }, created),
    subscriptions: await seed(admin, 'subscriptions', { organization_id: org.B.id, plan: 'business', status: 'active' }, created),
    audit_logs: await seed(admin, 'audit_logs', { organization_id: org.B.id, actor_user_id: user.ownerB.id, action: 'seeded_log', entity_type: 'rls_validation', entity_id: suffix }, created),
    invitations: await seed(admin, 'invitations', { organization_id: org.B.id, email: `invite-${suffix}@example.com`, role: 'member', token: `seed-${suffix}`, invited_by: user.ownerB.id, expires_at: future }, created),
    onboarding_activation_runs: await seed(admin, 'onboarding_activation_runs', { organization_id: org.B.id, created_by: user.ownerB.id, country: 'PT', company_type: 'startup', sector: 'technology', ai_usage_level: 'active', initial_risk_level: 'limited', readiness_score: 42, status: 'completed' }, created),
    monitoring_preferences: await seed(admin, 'monitoring_preferences', { organization_id: org.B.id, user_id: user.ownerB.id, email: user.ownerB.email, regulatory_change_alerts: true, monthly_review_reminders: true, low_score_alerts: true }, created),
  };
  const regulatory = await seed(admin, 'regulatory_updates', { title: `Regulatory ${suffix}`, summary: 'Synthetic proof', severity: 'low', source_url: `https://example.com/${suffix}`, published_at: now() }, created);
  const assessmentA = await seed(admin, 'ai_assessments', { organization_id: org.A.id, created_by: user.ownerA.id, title: `Assessment A ${suffix}`, status: 'completed', risk_score: 30, risk_level: 'limited', recommendations: [] }, created);
  const assessmentB = await seed(admin, 'ai_assessments', { organization_id: org.B.id, created_by: user.ownerB.id, title: `Assessment B ${suffix}`, status: 'completed', risk_score: 42, risk_level: 'limited', recommendations: [] }, created);
  const notificationB = await seed(admin, 'notifications', { organization_id: org.B.id, user_id: user.ownerB.id, title: `Notification ${suffix}`, message: 'Synthetic proof', type: 'info' }, created);
  const unlicensedAi = await seed(admin, 'ai_systems', { organization_id: org.U.id, name: `Unlicensed AI ${suffix}`, use_case: 'negative proof', created_by: user.unlicensed.id }, created);
  return { suffix, password, created, user, org, member, seeds, regulatory, assessmentA, assessmentB, notificationB, unlicensedAi };
}

function spec(table, c) {
  const id = c.org.B.id, s = c.suffix, u = c.user;
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  return ({
    organizations: { seed: c.seeds.organizations, insert: { name: `Cross ${s}`, slug: `cross-${s}`, created_by: u.ownerA.id }, update: { name: `Mutated ${s}` } },
    organization_members: { seed: c.seeds.organization_members, insert: { organization_id: id, user_id: u.ownerA.id, role: 'viewer' }, update: { role: 'admin' } },
    profiles: { seed: c.seeds.profiles, insert: { id: u.viewerA.id, full_name: `Cross profile ${s}` }, update: { full_name: `Mutated ${s}` } },
    ai_systems: { seed: c.seeds.ai_systems, insert: { organization_id: id, name: `Cross AI ${s}`, use_case: 'proof', created_by: u.ownerA.id }, same: { organization_id: id, name: `Same AI ${s}`, use_case: 'proof', created_by: u.ownerB.id }, update: { name: `Mutated ${s}` } },
    compliance_tasks: { seed: c.seeds.compliance_tasks, insert: { organization_id: id, created_by: u.ownerA.id, title: `Cross task ${s}`, category: 'general' }, sameDenied: { organization_id: id, created_by: u.ownerB.id, title: `Direct org task ${s}`, category: 'general' }, update: { title: `Mutated ${s}` } },
    documents: { seed: c.seeds.documents, insert: { organization_id: id, uploaded_by: u.ownerA.id, name: `Cross doc ${s}`, category: 'general', storage_path: `${id}/cross-${s}` }, same: { organization_id: id, uploaded_by: u.ownerB.id, name: `Same doc ${s}`, category: 'general', storage_path: `${id}/same-${s}` }, update: { name: `Mutated ${s}` } },
    risks: { seed: c.seeds.risks, insert: { organization_id: id, created_by: u.ownerA.id, title: `Cross risk ${s}`, category: 'general' }, same: { organization_id: id, created_by: u.ownerB.id, owner_user_id: u.ownerB.id, title: `Same risk ${s}`, category: 'general' }, update: { title: `Mutated ${s}` } },
    vendors: { seed: c.seeds.vendors, insert: { organization_id: id, created_by: u.ownerA.id, name: `Cross vendor ${s}`, category: 'general' }, same: { organization_id: id, created_by: u.ownerB.id, name: `Same vendor ${s}`, category: 'general' }, update: { name: `Mutated ${s}` } },
    subscriptions: { seed: c.seeds.subscriptions, insert: { organization_id: c.org.target.id, plan: 'enterprise', status: 'active' }, sameDenied: { organization_id: id, plan: 'enterprise', status: 'active' }, update: { plan: 'free' } },
    audit_logs: { seed: c.seeds.audit_logs, insert: { organization_id: id, actor_user_id: u.ownerA.id, action: 'cross', entity_type: 'proof', entity_id: s }, sameDenied: { organization_id: id, actor_user_id: u.ownerB.id, action: 'same', entity_type: 'proof', entity_id: s }, update: { action: 'mutated' } },
    invitations: { seed: c.seeds.invitations, insert: { organization_id: id, email: `cross-${s}@example.com`, role: 'member', token: `cross-${s}`, invited_by: u.ownerA.id, expires_at: future }, sameDenied: { organization_id: id, email: `same-${s}@example.com`, role: 'member', token: `same-${s}`, invited_by: u.ownerB.id, expires_at: future }, update: { role: 'admin' } },
    onboarding_activation_runs: { seed: c.seeds.onboarding_activation_runs, insert: { organization_id: id, created_by: u.ownerA.id, country: 'PT', company_type: 'startup', sector: 'technology', ai_usage_level: 'active', initial_risk_level: 'limited', readiness_score: 38, status: 'completed' }, same: { organization_id: id, created_by: u.ownerB.id, country: 'PT', company_type: 'startup', sector: 'technology', ai_usage_level: 'active', initial_risk_level: 'limited', readiness_score: 75, status: 'completed' }, update: { readiness_score: 44 } },
    monitoring_preferences: { seed: c.seeds.monitoring_preferences, insert: { organization_id: id, user_id: u.ownerA.id, email: u.ownerA.email, regulatory_change_alerts: true, monthly_review_reminders: false, low_score_alerts: true }, same: { organization_id: id, user_id: u.adminB.id, email: u.adminB.email, regulatory_change_alerts: true, monthly_review_reminders: true, low_score_alerts: false }, update: { low_score_alerts: false } },
  })[table];
}

async function horizontal(admin, clients, c, tests) {
  const member = clients.memberB, owner = clients.ownerB;
  for (const [op, action] of [
    ['horizontal_other_user_read_denied', () => readDenied(member, 'monitoring_preferences', c.seeds.monitoring_preferences.id)],
    ['horizontal_other_user_update_denied', () => updateDenied(admin, member, 'monitoring_preferences', c.seeds.monitoring_preferences.id, { low_score_alerts: false })],
    ['horizontal_other_user_delete_denied', () => deleteDenied(admin, member, 'monitoring_preferences', c.seeds.monitoring_preferences.id)],
  ]) tests.push({ table: 'monitoring_preferences', operation: op, ...(await action()) });
  const self = await insertAllowed(member, 'monitoring_preferences', { organization_id: c.org.B.id, user_id: c.user.memberB.id, email: c.user.memberB.email, regulatory_change_alerts: true, monthly_review_reminders: false, low_score_alerts: true });
  tests.push({ table: 'monitoring_preferences', operation: 'horizontal_self_insert_allowed', ...self });
  if (self.insertedId) c.created.rows.push(['monitoring_preferences', self.insertedId]);
  tests.push({ table: 'monitoring_preferences', operation: 'horizontal_self_read_allowed', ...(self.insertedId ? await readAllowed(member, 'monitoring_preferences', self.insertedId) : { passed: false, returnedRows: 0, error: null }) });

  tests.push({ table: 'notifications', operation: 'horizontal_recipient_read_allowed', ...(await readAllowed(owner, 'notifications', c.notificationB.id)) });
  tests.push({ table: 'notifications', operation: 'horizontal_other_user_read_denied', ...(await readDenied(member, 'notifications', c.notificationB.id)) });
  tests.push({ table: 'notifications', operation: 'horizontal_other_user_update_denied', ...(await updateDenied(admin, member, 'notifications', c.notificationB.id, { read_at: now() })) });
  tests.push({ table: 'notifications', operation: 'horizontal_other_user_delete_denied', ...(await deleteDenied(admin, member, 'notifications', c.notificationB.id)) });
  tests.push({ table: 'notifications', operation: 'horizontal_authenticated_insert_denied', ...(await insertDenied(member, 'notifications', { organization_id: c.org.B.id, user_id: c.user.memberB.id, title: `Forbidden ${c.suffix}`, message: 'proof', type: 'info' })) });

  tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_read_allowed', ...(await readAllowed(member, 'onboarding_activation_runs', c.seeds.onboarding_activation_runs.id)) });
  tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_insert_denied', ...(await insertDenied(member, 'onboarding_activation_runs', { organization_id: c.org.B.id, created_by: c.user.memberB.id, country: 'PT', company_type: 'startup', sector: 'technology', ai_usage_level: 'active', initial_risk_level: 'limited', readiness_score: 13, status: 'completed' })) });
  tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_update_denied', ...(await updateDenied(admin, member, 'onboarding_activation_runs', c.seeds.onboarding_activation_runs.id, { readiness_score: 7 })) });
  tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_delete_denied', ...(await deleteDenied(admin, member, 'onboarding_activation_runs', c.seeds.onboarding_activation_runs.id)) });
}

async function assessments(admin, clients, c, rows, tests) {
  tests.push(rlsTest('ai_assessments', rows));
  tests.push({ table: 'ai_assessments', operation: 'cross_tenant_read', ...(await readDenied(clients.ownerA, 'ai_assessments', c.assessmentB.id)) });
  tests.push({ table: 'ai_assessments', operation: 'cross_tenant_insert', ...(await insertDenied(clients.ownerA, 'ai_assessments', { organization_id: c.org.B.id, created_by: c.user.ownerA.id, title: `Cross ${c.suffix}`, status: 'draft' })) });
  tests.push({ table: 'ai_assessments', operation: 'cross_tenant_update', ...(await updateDenied(admin, clients.ownerA, 'ai_assessments', c.assessmentB.id, { title: `Mutated ${c.suffix}` })) });
  tests.push({ table: 'ai_assessments', operation: 'cross_tenant_delete', ...(await deleteDenied(admin, clients.ownerA, 'ai_assessments', c.assessmentB.id)) });
  tests.push({ table: 'ai_assessments', operation: 'same_tenant_read', ...(await readAllowed(clients.ownerB, 'ai_assessments', c.assessmentB.id)) });
  for (const [who, identity, op, pass] of [
    ['ownerB', c.user.ownerB, 'same_tenant_insert', true], ['adminB', c.user.adminB, 'admin_same_tenant_insert', true],
    ['memberB', c.user.memberB, 'member_same_tenant_insert_denied', false], ['viewerA', c.user.viewerA, 'viewer_same_tenant_insert_denied', false],
  ]) {
    const targetOrg = who === 'viewerA' ? c.org.A.id : c.org.B.id;
    const result = pass ? await insertAllowed(clients[who], 'ai_assessments', { organization_id: targetOrg, created_by: identity.id, title: `${op} ${c.suffix}`, status: 'draft' }) : await insertDenied(clients[who], 'ai_assessments', { organization_id: targetOrg, created_by: identity.id, title: `${op} ${c.suffix}`, status: 'draft' });
    tests.push({ table: 'ai_assessments', operation: op, ...result });
    if (result.insertedId) c.created.rows.push(['ai_assessments', result.insertedId]);
  }
  tests.push({ table: 'ai_assessments', operation: 'member_same_tenant_read', ...(await readAllowed(clients.memberB, 'ai_assessments', c.assessmentB.id)) });
  tests.push({ table: 'ai_assessments', operation: 'member_same_tenant_update_denied', ...(await updateDenied(admin, clients.memberB, 'ai_assessments', c.assessmentB.id, { title: 'member mutation' })) });
  tests.push({ table: 'ai_assessments', operation: 'member_same_tenant_delete_denied', ...(await deleteDenied(admin, clients.memberB, 'ai_assessments', c.assessmentB.id)) });
  tests.push({ table: 'ai_assessments', operation: 'viewer_same_tenant_read', ...(await readAllowed(clients.viewerA, 'ai_assessments', c.assessmentA.id)) });
  tests.push({ table: 'ai_assessments', operation: 'viewer_same_tenant_update_denied', ...(await updateDenied(admin, clients.viewerA, 'ai_assessments', c.assessmentA.id, { title: 'viewer mutation' })) });
  tests.push({ table: 'ai_assessments', operation: 'viewer_same_tenant_delete_denied', ...(await deleteDenied(admin, clients.viewerA, 'ai_assessments', c.assessmentA.id)) });
}

async function postV20(admin, anon, clients, c, tests) {
  tests.push({ table: 'ai_systems', operation: 'unlicensed_same_tenant_read_denied', ...(await readDenied(clients.unlicensed, 'ai_systems', c.unlicensedAi.id)) });
  tests.push({ table: 'ai_systems', operation: 'unlicensed_same_tenant_insert_denied', ...(await insertDenied(clients.unlicensed, 'ai_systems', { organization_id: c.org.U.id, name: `Forbidden ${c.suffix}`, use_case: 'proof', created_by: c.user.unlicensed.id })) });
  tests.push({ table: 'ai_systems', operation: 'anonymous_paid_table_read_denied', ...(await readDenied(anon, 'ai_systems', c.seeds.ai_systems.id)) });
  tests.push({ table: 'regulatory_updates', operation: 'authenticated_read_denied', ...(await readDenied(clients.ownerB, 'regulatory_updates', c.regulatory.id)) });
  tests.push({ table: 'regulatory_updates', operation: 'authenticated_insert_denied', ...(await insertDenied(clients.ownerB, 'regulatory_updates', { title: `Forbidden ${c.suffix}`, summary: 'proof', severity: 'low', source_url: `https://example.com/forbidden-${c.suffix}`, published_at: now() })) });
  tests.push({ table: 'regulatory_updates', operation: 'authenticated_update_denied', ...(await updateDenied(admin, clients.ownerB, 'regulatory_updates', c.regulatory.id, { title: 'forbidden' })) });
  tests.push({ table: 'regulatory_updates', operation: 'authenticated_delete_denied', ...(await deleteDenied(admin, clients.ownerB, 'regulatory_updates', c.regulatory.id)) });
  tests.push({ table: 'regulatory_updates', operation: 'service_role_read_allowed', ...(await readAllowed(admin, 'regulatory_updates', c.regulatory.id)) });
  const helper = await clients.ownerB.rpc('eurocomply_live_rls_inventory', { table_names: ['ai_systems'] });
  tests.push({ table: 'eurocomply_live_rls_inventory', operation: 'authenticated_execute_denied', passed: denied(helper.error), returnedRows: Array.isArray(helper.data) ? helper.data.length : 0, error: safeError(helper.error) });
  const legacy = await clients.ownerB.from('compliance_evidence').select('id').limit(1);
  tests.push({ table: 'compliance_evidence', operation: 'authenticated_read_denied', passed: denied(legacy.error), returnedRows: Array.isArray(legacy.data) ? legacy.data.length : 0, error: safeError(legacy.error) });
  tests.push({ table: 'evidence_items', operation: 'unlicensed_insert_denied', ...(await insertDenied(clients.unlicensed, 'evidence_items', { organization_id: c.org.U.id, user_id: c.user.unlicensed.id, title: 'Forbidden Evidence', evidence_type: 'document', status: 'draft', article_refs: [] })) });
  const { data: bucket, error } = await admin.storage.getBucket('compliance-evidence');
  tests.push({ table: 'storage.buckets', operation: 'compliance_evidence_private', passed: !error && bucket?.public === false, returnedRows: bucket ? 1 : 0, error: safeError(error) });
  const orphan = await clients.ownerB.storage.from('compliance-evidence').upload(`${c.org.B.id}/${crypto.randomUUID()}/orphan.txt`, Buffer.from('bounded proof\n'), { upsert: false, contentType: 'text/plain' });
  tests.push({ table: 'storage.objects', operation: 'orphan_evidence_insert_denied', passed: denied(orphan.error), returnedRows: orphan.data ? 1 : 0, error: safeError(orphan.error) });
}

export async function main() {
  assert(process.env.GITHUB_ACTIONS === 'true', 'github_actions_required');
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL'), anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const sha = commitSha();
  assert(/^[a-f0-9]{40}$/.test(sha), 'exact_sha_required');
  assert(/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(url), 'live_supabase_url_required');
  assert(/^\d+$/.test(String(process.env.PROMOTION_RUN_ID ?? '')), 'promotion_run_required');
  const admin = client(url, serviceKey), anon = client(url, anonKey);
  const clients = Object.fromEntries(['ownerA', 'viewerA', 'ownerB', 'adminB', 'memberB', 'unlicensed'].map((name) => [name, client(url, anonKey)]));
  const created = { users: [], rows: [], organizations: [] };
  let c, failure, cleanupFailure, tests = [];
  try {
    const rows = await inventory(admin, [...new Set([...customerTenantTables, ...globalReferenceTables, 'ai_assessments', 'evidence_items'])]);
    tests.push(...customerTenantTables.map((table) => rlsTest(table, rows)), rlsTest('regulatory_updates', rows));
    c = await setup(admin, created);
    for (const name of Object.keys(clients)) await signIn(clients[name], c.user[name], c.password, name);

    for (const table of customerTenantTables) {
      const s = spec(table, c); assert(s?.seed?.id, `missing_spec:${table}`);
      tests.push({ table, operation: 'cross_tenant_read', ...(await readDenied(clients.ownerA, table, s.seed.id)) });
      tests.push({ table, operation: 'cross_tenant_insert', ...(await insertDenied(clients.ownerA, table, s.insert)) });
      tests.push({ table, operation: 'cross_tenant_update', ...(await updateDenied(admin, clients.ownerA, table, s.seed.id, s.update)) });
      tests.push({ table, operation: 'cross_tenant_delete', ...(await deleteDenied(admin, clients.ownerA, table, s.seed.id)) });
      tests.push({ table, operation: backendOwnedTables.includes(table) ? 'same_tenant_read_backend_only' : 'same_tenant_read', ...(await readAllowed(clients.ownerB, table, s.seed.id)) });
      if (sameTenantWritableTables.includes(table) && s.same) {
        const result = await insertAllowed(clients.ownerB, table, s.same); tests.push({ table, operation: 'same_tenant_insert', ...result });
        if (result.insertedId) created.rows.push([table, result.insertedId]);
      }
      if (backendOwnedTables.includes(table)) {
        const direct = s.sameDenied ?? s.insert;
        tests.push({ table, operation: 'same_tenant_insert_denied', ...(await insertDenied(clients.ownerB, table, direct)) });
        tests.push({ table, operation: 'same_tenant_update_denied', ...(await updateDenied(admin, clients.ownerB, table, s.seed.id, s.update)) });
        tests.push({ table, operation: 'same_tenant_delete_denied', ...(await deleteDenied(admin, clients.ownerB, table, s.seed.id)) });
      }
    }

    tests.push({ table: 'organization_members', operation: requiredViewerAdminDenyOperations[0], ...(await insertDenied(clients.viewerA, 'organization_members', { organization_id: c.org.A.id, user_id: c.user.candidateA.id, role: 'admin' })) });
    tests.push({ table: 'organization_members', operation: requiredViewerAdminDenyOperations[1], ...(await updateDenied(admin, clients.viewerA, 'organization_members', c.member.viewerA.id, { role: 'admin' })) });
    tests.push({ table: 'organization_members', operation: requiredViewerAdminDenyOperations[2], ...(await deleteDenied(admin, clients.viewerA, 'organization_members', c.member.ownerA.id)) });
    await horizontal(admin, clients, c, tests);
    await assessments(admin, clients, c, rows, tests);
    await postV20(admin, anon, clients, c, tests);

    const failed = tests.filter((test) => test.passed !== true);
    if (failed.length) throw new Error(`live_rls_failed:${failed.map((x) => `${x.table}:${x.operation}`).join(',')}`);
    const evidence = buildEvidencePayload({ status: 'Complete', outcome: 'passed', supabaseUrl: url, command: `node ${runner}`, commitSha: sha, testCases: tests, failures: [], tablesReviewed: tableCoverageFrom(tests), serviceRolePaths: [
      { path: 'fixture_setup', purpose: 'synthetic tenants and bounded signed-contract authority' },
      { path: 'rls_inventory', purpose: 'service-role-only live policy inventory' },
      { path: 'post_assertion_integrity_checks', purpose: 'verify denied operations preserve rows' },
      { path: 'fixture_cleanup', purpose: 'remove synthetic app, entitlement and compatibility state' },
    ], extra: {
      horizontalIsolation: { status: 'passed', sameTenantDistinctUsers: true, checkedAt: now(), testedTables: ['monitoring_preferences', 'notifications', 'onboarding_activation_runs'] },
      paymentFirstV20: { licensedTenantsProved: true, unlicensedSameTenantDenied: true, regulatoryUpdatesBackendOnly: true, providerEventsCreated: false, stripeLifecycleSynthesized: false },
      evidenceVaultV20: { unlicensedMetadataInsertDenied: true, privateBucketProved: true, orphanStorageInsertDenied: true, disposablePositiveDataPlaneProofRequiredSeparately: true },
      aiAssessmentsLiveValidation: { status: 'Complete', outcome: 'passed', roleCoverage: ['owner', 'admin', 'member', 'viewer'], crossTenantAccessDenied: true },
    } });
    const canonical = validatePassingEvidence(evidence); if (!canonical.valid) throw new Error(`canonical_evidence_invalid:${canonical.errors.join(';')}`);
    const horizontalResult = validateHorizontalIsolationEvidence(evidence); if (!horizontalResult.valid) throw new Error(`horizontal_evidence_invalid:${horizontalResult.errors.join(';')}`);
    writeEvidence(evidence);
  } catch (error) { failure = error instanceof Error ? error : new Error(String(error)); }
  try {
    if (created.users.length || created.rows.length || created.organizations.length) {
      const cleanup = await cleanupV20SyntheticFixture(admin, created);
      if (cleanup?.cleanupPassed !== true) throw new Error('fixture_cleanup_not_confirmed');
    }
  } catch (error) { cleanupFailure = error instanceof Error ? error : new Error(String(error)); }
  if (failure || cleanupFailure) {
    const reason = [failure?.message, cleanupFailure?.message].filter(Boolean).join('; ');
    writeEvidence(buildEvidencePayload({ status: 'Open', outcome: 'failed', supabaseUrl: url, command: `node ${runner}`, commitSha: sha, testCases: tests, failures: [reason], tablesReviewed: tableCoverageFrom(tests), serviceRolePaths: [
      { path: 'fixture_setup', purpose: 'synthetic setup' }, { path: 'rls_inventory', purpose: 'live inventory' },
      { path: 'post_assertion_integrity_checks', purpose: 'integrity checks' }, { path: 'fixture_cleanup', purpose: 'strict cleanup' },
    ], extra: { blockingReason: reason, cleanupPassed: !cleanupFailure, horizontalIsolation: { status: 'failed', sameTenantDistinctUsers: true } } }));
    throw new Error(reason || 'post_v20_live_rls_failed');
  }
  process.stdout.write('Supabase post-V20 live RLS validation: Complete/passed\n');
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
