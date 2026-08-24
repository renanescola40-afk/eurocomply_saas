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
  requiredSameTenantReadOperations,
  requiredViewerAdminDenyOperations,
  sameTenantWritableTables,
  tableCoverageFrom,
  validatePassingEvidence,
} from './supabase-live-rls-evidence.mjs';
import { validateHorizontalIsolationEvidence } from './supabase-horizontal-rls-evidence.mjs';
import {
  cleanupV20SyntheticFixture,
  grantBoundedV20CommercialAuthority,
} from './supabase-v20-live-fixtures.mjs';

const evidencePath = path.join(
  'docs',
  'security',
  'evidence',
  'runtime',
  'supabase-live-rls-validation.json',
);
const runner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
const authOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};
const expectedDenialCodes = new Set(['42501', 'PGRST301', 'PGRST302', 'PGRST205']);
const expectedDenialText = /(row-level security|permission denied|not authorized|unauthorized|forbidden|new row violates|schema cache|could not find the table)/i;
const requiredCommercialForceRlsTables = [
  'ai_systems',
  'compliance_tasks',
  'documents',
  'risks',
  'vendors',
  'audit_logs',
  'invitations',
  'onboarding_activation_runs',
  'monitoring_preferences',
  'evidence_items',
  'ai_assessments',
];

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const noRows = (data) => data == null || (Array.isArray(data) && data.length === 0);
const safeError = (error) => error
  ? {
      code: String(error.code ?? 'unknown').slice(0, 48),
      message: String(error.message ?? 'error').slice(0, 220),
    }
  : null;
const isExpectedDenial = (error) => Boolean(error)
  && (
    expectedDenialCodes.has(String(error.code ?? ''))
    || expectedDenialText.test(String(error.message ?? ''))
  );

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function commandUsed() {
  return `node ${runner}`;
}

function getCommitSha() {
  if (/^[a-f0-9]{40}$/i.test(String(process.env.GITHUB_SHA ?? ''))) {
    return String(process.env.GITHUB_SHA).toLowerCase();
  }
  try {
    const sha = execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().toLowerCase();
    if (/^[a-f0-9]{40}$/.test(sha)) return sha;
  } catch {}
  return 'unknown';
}

function requireEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function client(url, key) {
  return createClient(url, key, authOptions);
}

function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
}

async function signIn(supabase, identity, password, label) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identity.email,
    password,
  });
  if (error || !data.session) {
    throw new Error(`${label}_sign_in_failed:${error?.message ?? 'missing_session'}`);
  }
}

function missingColumn(error, table) {
  const message = String(error?.message ?? '');
  const schemaMatch = message.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
  if (schemaMatch?.[2] === table) return schemaMatch[1];
  const sqlMatch = message.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i);
  return sqlMatch?.[2] === table ? sqlMatch[1] : null;
}

async function insertWithFallback(supabase, table, row, select = '*', single = false) {
  let payload = { ...row };
  const removedColumns = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const query = supabase.from(table).insert(payload).select(select);
    const result = single ? await query.single() : await query;
    if (!result.error) return { ...result, removedColumns };
    const column = missingColumn(result.error, table);
    if (column && Object.hasOwn(payload, column)) {
      delete payload[column];
      removedColumns.push(column);
      continue;
    }
    return { ...result, removedColumns };
  }
  return {
    data: null,
    error: new Error(`Could not adapt ${table} payload to deployed schema.`),
    removedColumns,
  };
}

async function insertOne(admin, table, row, createdRows, label = table) {
  const { data, error } = await insertWithFallback(admin, table, row, '*', true);
  if (error || !data?.id) {
    throw new Error(`${label}_seed_failed:${error?.message ?? 'missing_id'}`);
  }
  createdRows.push([table, data.id]);
  return data;
}

async function upsertProfile(admin, user, createdRows) {
  const { data, error } = await admin
    .from('profiles')
    .upsert({ id: user.id, full_name: `RLS ${user.email}`, avatar_url: null }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error || !data?.id) throw new Error(`profile_seed_failed:${error?.message ?? 'missing_id'}`);
  createdRows.push(['profiles', data.id]);
  return data;
}

async function createUser(admin, label, suffix, password, createdUsers) {
  const email = `rls-v20-${label}-${suffix}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: 'post-v20-live-rls-validation', label },
  });
  if (error || !data.user?.id) {
    throw new Error(`${label}_user_create_failed:${error?.message ?? 'missing_user_id'}`);
  }
  createdUsers.push(data.user.id);
  return { id: data.user.id, email };
}

async function loadInventory(admin, tableNames) {
  const { data, error } = await admin.rpc('eurocomply_live_rls_inventory', {
    table_names: tableNames,
  });
  if (error || !Array.isArray(data)) {
    throw new Error(`service_role_inventory_failed:${error?.message ?? 'missing_inventory'}`);
  }
  return data;
}

function rlsCase(table, inventory, requireForce = false) {
  const row = inventory.find((item) => item?.table_name === table);
  return {
    table,
    operation: 'rls_enabled',
    passed: row?.exists === true
      && row?.rls_enabled === true
      && Number(row?.policy_count ?? 0) > 0
      && (!requireForce || row?.force_rls === true),
    exists: row?.exists === true,
    rlsEnabled: row?.rls_enabled === true,
    forceRls: row?.force_rls === true,
    policyCount: Number(row?.policy_count ?? 0),
  };
}

async function readAllowed(supabase, table, id) {
  const { data, error } = await supabase.from(table).select('id').eq('id', id).limit(1);
  return {
    passed: !error && Array.isArray(data) && data.length === 1,
    returnedRows: Array.isArray(data) ? data.length : 0,
    error: safeError(error),
  };
}

async function readDenied(supabase, table, id) {
  const { data, error } = await supabase.from(table).select('id').eq('id', id).limit(1);
  return {
    passed: isExpectedDenial(error) || (!error && noRows(data)),
    returnedRows: Array.isArray(data) ? data.length : 0,
    error: safeError(error),
  };
}

async function insertAllowed(supabase, table, row) {
  const { data, error, removedColumns } = await insertWithFallback(supabase, table, row, 'id');
  const insertedId = Array.isArray(data) && data.length === 1 ? data[0]?.id : null;
  return {
    passed: !error && Boolean(insertedId),
    insertedId,
    returnedRows: Array.isArray(data) ? data.length : 0,
    removedMissingColumns: removedColumns,
    error: safeError(error),
  };
}

async function insertDenied(supabase, table, row) {
  const { data, error, removedColumns } = await insertWithFallback(supabase, table, row, 'id');
  return {
    passed: isExpectedDenial(error),
    returnedRows: Array.isArray(data) ? data.length : 0,
    removedMissingColumns: removedColumns,
    error: safeError(error),
  };
}

async function updateDenied(admin, supabase, table, id, patch) {
  const before = await admin.from(table).select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('id');
  const after = await admin.from(table).select('*').eq('id', id).maybeSingle();
  const unchanged = JSON.stringify(before.data) === JSON.stringify(after.data);
  return {
    passed: unchanged && (isExpectedDenial(error) || (!error && noRows(data))),
    returnedRows: Array.isArray(data) ? data.length : 0,
    unchangedAfterAttempt: unchanged,
    error: safeError(error),
  };
}

async function deleteDenied(admin, supabase, table, id) {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  const after = await admin.from(table).select('id').eq('id', id).maybeSingle();
  return {
    passed: Boolean(after.data?.id) && (isExpectedDenial(error) || (!error && noRows(data))),
    returnedRows: Array.isArray(data) ? data.length : 0,
    rowStillExists: Boolean(after.data?.id),
    error: safeError(error),
  };
}

async function setup(admin) {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const password = `Rls!${crypto.randomBytes(18).toString('base64url')}9aA`;
  const created = { users: [], rows: [], organizations: [] };

  const ownerA = await createUser(admin, 'owner-a', suffix, password, created.users);
  const viewerA = await createUser(admin, 'viewer-a', suffix, password, created.users);
  const ownerB = await createUser(admin, 'owner-b', suffix, password, created.users);
  const adminB = await createUser(admin, 'admin-b', suffix, password, created.users);
  const memberB = await createUser(admin, 'member-b', suffix, password, created.users);
  const ownerU = await createUser(admin, 'unlicensed', suffix, password, created.users);

  const orgA = await insertOne(admin, 'organizations', {
    name: `RLS V20 Tenant A ${suffix}`,
    slug: `rls-v20-a-${suffix}`,
    created_by: ownerA.id,
  }, created.rows, 'organization_a');
  const orgB = await insertOne(admin, 'organizations', {
    name: `RLS V20 Tenant B ${suffix}`,
    slug: `rls-v20-b-${suffix}`,
    created_by: ownerB.id,
  }, created.rows, 'organization_b');
  const orgInsertTarget = await insertOne(admin, 'organizations', {
    name: `RLS V20 Insert Target ${suffix}`,
    slug: `rls-v20-target-${suffix}`,
    created_by: ownerB.id,
  }, created.rows, 'organization_insert_target');
  const orgU = await insertOne(admin, 'organizations', {
    name: `RLS V20 Unlicensed ${suffix}`,
    slug: `rls-v20-u-${suffix}`,
    created_by: ownerU.id,
  }, created.rows, 'organization_unlicensed');
  created.organizations.push(orgA.id, orgB.id, orgInsertTarget.id, orgU.id);

  const membershipRows = [];
  for (const [organizationId, userId, role, seatType, label] of [
    [orgA.id, ownerA.id, 'owner', 'full', 'membership_owner_a'],
    [orgA.id, viewerA.id, 'viewer', 'viewer', 'membership_viewer_a'],
    [orgB.id, ownerB.id, 'owner', 'full', 'membership_owner_b'],
    [orgB.id, adminB.id, 'admin', 'full', 'membership_admin_b'],
    [orgB.id, memberB.id, 'member', 'participant', 'membership_member_b'],
    [orgU.id, ownerU.id, 'owner', 'full', 'membership_owner_u'],
  ]) {
    membershipRows.push(await insertOne(admin, 'organization_members', {
      organization_id: organizationId,
      user_id: userId,
      role,
      seat_type: seatType,
      status: 'active',
    }, created.rows, label));
  }

  await grantBoundedV20CommercialAuthority(admin, orgA.id, `tenant-a-${suffix}`);
  await grantBoundedV20CommercialAuthority(admin, orgB.id, `tenant-b-${suffix}`);

  const profileB = await upsertProfile(admin, ownerB, created.rows);

  const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const seeds = {
    organizations: orgB,
    organization_members: membershipRows[2],
    profiles: profileB,
    ai_systems: await insertOne(admin, 'ai_systems', {
      organization_id: orgB.id,
      name: `tenant-b-ai-system-${suffix}`,
      use_case: 'post-v20 RLS validation',
      created_by: ownerB.id,
    }, created.rows),
    compliance_tasks: await insertOne(admin, 'compliance_tasks', {
      organization_id: orgB.id,
      created_by: ownerB.id,
      assigned_to: ownerB.id,
      title: `tenant-b-compliance-task-${suffix}`,
      category: 'general',
    }, created.rows),
    documents: await insertOne(admin, 'documents', {
      organization_id: orgB.id,
      uploaded_by: ownerB.id,
      name: `tenant-b-doc-${suffix}`,
      category: 'general',
      storage_path: `${orgB.id}/doc-${suffix}.txt`,
    }, created.rows),
    risks: await insertOne(admin, 'risks', {
      organization_id: orgB.id,
      created_by: ownerB.id,
      owner_user_id: ownerB.id,
      title: `tenant-b-risk-${suffix}`,
      category: 'general',
    }, created.rows),
    vendors: await insertOne(admin, 'vendors', {
      organization_id: orgB.id,
      created_by: ownerB.id,
      name: `tenant-b-vendor-${suffix}`,
      category: 'general',
    }, created.rows),
    subscriptions: await insertOne(admin, 'subscriptions', {
      organization_id: orgB.id,
      plan: 'business',
      status: 'active',
    }, created.rows),
    audit_logs: await insertOne(admin, 'audit_logs', {
      organization_id: orgB.id,
      actor_user_id: ownerB.id,
      action: 'seeded_log',
      entity_type: 'rls_validation',
      entity_id: suffix,
    }, created.rows),
    invitations: await insertOne(admin, 'invitations', {
      organization_id: orgB.id,
      email: `tenant-b-${suffix}@example.com`,
      role: 'member',
      token: `seed-${suffix}`,
      invited_by: ownerB.id,
      expires_at: futureIso,
    }, created.rows),
    onboarding_activation_runs: await insertOne(admin, 'onboarding_activation_runs', {
      organization_id: orgB.id,
      created_by: ownerB.id,
      country: 'PT',
      company_type: 'startup',
      sector: 'technology',
      ai_usage_level: 'active',
      initial_risk_level: 'limited',
      readiness_score: 42,
      status: 'completed',
    }, created.rows),
    monitoring_preferences: await insertOne(admin, 'monitoring_preferences', {
      organization_id: orgB.id,
      user_id: ownerB.id,
      email: ownerB.email,
      regulatory_change_alerts: true,
      monthly_review_reminders: true,
      low_score_alerts: true,
    }, created.rows),
  };

  const regulatory = await insertOne(admin, 'regulatory_updates', {
    title: `Post V20 backend-only reference ${suffix}`,
    summary: 'Synthetic post-V20 RLS validation row',
    severity: 'low',
    source_url: `https://example.com/post-v20/${suffix}`,
    published_at: now(),
  }, created.rows);

  const assessmentA = await insertOne(admin, 'ai_assessments', {
    organization_id: orgA.id,
    created_by: ownerA.id,
    title: `tenant-a-ai-assessment-${suffix}`,
    status: 'completed',
    risk_score: 30,
    risk_level: 'limited',
    recommendations: [{ control: 'post-v20-rls', tenant: 'a' }],
  }, created.rows);
  const assessmentB = await insertOne(admin, 'ai_assessments', {
    organization_id: orgB.id,
    created_by: ownerB.id,
    title: `tenant-b-ai-assessment-${suffix}`,
    status: 'completed',
    risk_score: 42,
    risk_level: 'limited',
    recommendations: [{ control: 'post-v20-rls', tenant: 'b' }],
  }, created.rows);

  const ownerNotification = await insertOne(admin, 'notifications', {
    organization_id: orgB.id,
    user_id: ownerB.id,
    title: `horizontal-owner-notification-${suffix}`,
    message: 'horizontal isolation proof',
    type: 'info',
  }, created.rows);

  const aiUnlicensed = await insertOne(admin, 'ai_systems', {
    organization_id: orgU.id,
    name: `unlicensed-ai-system-${suffix}`,
    use_case: 'payment-first negative proof',
    created_by: ownerU.id,
  }, created.rows);

  return {
    suffix,
    password,
    created,
    ownerA,
    viewerA,
    ownerB,
    adminB,
    memberB,
    ownerU,
    orgA,
    orgB,
    orgInsertTarget,
    orgU,
    seeds,
    regulatory,
    assessmentA,
    assessmentB,
    ownerNotification,
    aiUnlicensed,
  };
}

function specFor(table, ctx) {
  const org = ctx.orgB.id;
  const s = ctx.suffix;
  const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const specs = {
    organizations: {
      seed: ctx.seeds.organizations,
      insert: { name: `cross-org-${s}`, slug: `cross-org-${s}`, created_by: ctx.ownerA.id },
      update: { name: `mutated-org-${s}` },
    },
    organization_members: {
      seed: ctx.seeds.organization_members,
      insert: { organization_id: org, user_id: ctx.ownerA.id, role: 'viewer' },
      update: { role: 'admin' },
    },
    profiles: {
      seed: ctx.seeds.profiles,
      insert: { id: ctx.viewerA.id, full_name: `cross-user-profile-${s}`, avatar_url: null },
      update: { full_name: `mutated-profile-${s}` },
    },
    ai_systems: {
      seed: ctx.seeds.ai_systems,
      insert: { organization_id: org, name: `cross-ai-system-${s}`, use_case: 'rls validation', created_by: ctx.ownerA.id },
      sameInsert: { organization_id: org, name: `same-ai-system-${s}`, use_case: 'rls validation', created_by: ctx.ownerB.id },
      update: { name: `mutated-ai-system-${s}` },
    },
    compliance_tasks: {
      seed: ctx.seeds.compliance_tasks,
      insert: { organization_id: org, created_by: ctx.ownerA.id, title: `cross-compliance-task-${s}`, category: 'general' },
      sameInsert: { organization_id: org, created_by: ctx.ownerB.id, assigned_to: ctx.ownerB.id, title: `same-compliance-task-${s}`, category: 'general' },
      update: { title: `mutated-compliance-task-${s}` },
    },
    documents: {
      seed: ctx.seeds.documents,
      insert: { organization_id: org, uploaded_by: ctx.ownerA.id, name: `cross-doc-${s}`, category: 'general', storage_path: `${org}/cross-${s}.txt` },
      sameInsert: { organization_id: org, uploaded_by: ctx.ownerB.id, name: `same-doc-${s}`, category: 'general', storage_path: `${org}/same-${s}.txt` },
      update: { name: `mutated-doc-${s}` },
    },
    risks: {
      seed: ctx.seeds.risks,
      insert: { organization_id: org, created_by: ctx.ownerA.id, title: `cross-risk-${s}`, category: 'general' },
      sameInsert: { organization_id: org, created_by: ctx.ownerB.id, owner_user_id: ctx.ownerB.id, title: `same-risk-${s}`, category: 'general' },
      update: { title: `mutated-risk-${s}` },
    },
    vendors: {
      seed: ctx.seeds.vendors,
      insert: { organization_id: org, created_by: ctx.ownerA.id, name: `cross-vendor-${s}`, category: 'general' },
      sameInsert: { organization_id: org, created_by: ctx.ownerB.id, name: `same-vendor-${s}`, category: 'general' },
      update: { name: `mutated-vendor-${s}` },
    },
    subscriptions: {
      seed: ctx.seeds.subscriptions,
      insert: { organization_id: ctx.orgInsertTarget.id, plan: 'enterprise', status: 'active' },
      sameDeniedInsert: { organization_id: org, plan: 'enterprise', status: 'active' },
      update: { plan: 'free' },
    },
    audit_logs: {
      seed: ctx.seeds.audit_logs,
      insert: { organization_id: org, actor_user_id: ctx.ownerA.id, action: 'cross_tenant_attempt', entity_type: 'rls_validation', entity_id: s },
      sameDeniedInsert: { organization_id: org, actor_user_id: ctx.ownerB.id, action: 'same_tenant_write_attempt', entity_type: 'rls_validation', entity_id: s },
      update: { action: 'mutated_log' },
    },
    invitations: {
      seed: ctx.seeds.invitations,
      insert: { organization_id: org, email: `cross-${s}@example.com`, role: 'member', token: `cross-${s}`, invited_by: ctx.ownerA.id, expires_at: futureIso },
      sameDeniedInsert: { organization_id: org, email: `same-denied-${s}@example.com`, role: 'member', token: `same-denied-${s}`, invited_by: ctx.ownerB.id, expires_at: futureIso },
      update: { role: 'admin' },
    },
    onboarding_activation_runs: {
      seed: ctx.seeds.onboarding_activation_runs,
      insert: { organization_id: org, created_by: ctx.ownerA.id, country: 'PT', company_type: 'startup', sector: 'technology', ai_usage_level: 'active', initial_risk_level: 'limited', readiness_score: 38, status: 'completed' },
      sameInsert: { organization_id: org, created_by: ctx.ownerB.id, country: 'PT', company_type: 'startup', sector: 'technology', ai_usage_level: 'active', initial_risk_level: 'limited', readiness_score: 75, status: 'completed' },
      update: { readiness_score: 44 },
    },
    monitoring_preferences: {
      seed: ctx.seeds.monitoring_preferences,
      insert: { organization_id: org, user_id: ctx.ownerA.id, email: ctx.ownerA.email, regulatory_change_alerts: true, monthly_review_reminders: false, low_score_alerts: true },
      sameInsert: { organization_id: org, user_id: ctx.memberB.id, email: ctx.memberB.email, regulatory_change_alerts: true, monthly_review_reminders: true, low_score_alerts: false },
      update: { low_score_alerts: false },
    },
  };
  return specs[table];
}

function serviceRolePaths() {
  return [
    { path: 'fixture_setup', purpose: 'Creates only synthetic tenants/users and bounded signed-contract authority after exact V20 promotion.' },
    { path: 'rls_inventory', purpose: 'Reads RLS/FORCE RLS metadata through the service-role-only inventory helper.' },
    { path: 'post_assertion_integrity_checks', purpose: 'Verifies denied browser/PostgREST writes do not mutate protected rows.' },
    { path: 'fixture_cleanup', purpose: 'Removes synthetic rows, entitlement authority, compatibility envelopes, organizations, and users.' },
  ];
}

async function runHorizontalTests(admin, clients, ctx, testCases) {
  const { ownerBClient, memberBClient } = clients;

  testCases.push({
    table: 'monitoring_preferences',
    operation: 'horizontal_other_user_read_denied',
    ...(await readDenied(memberBClient, 'monitoring_preferences', ctx.seeds.monitoring_preferences.id)),
  });
  testCases.push({
    table: 'monitoring_preferences',
    operation: 'horizontal_other_user_update_denied',
    ...(await updateDenied(admin, memberBClient, 'monitoring_preferences', ctx.seeds.monitoring_preferences.id, { low_score_alerts: false })),
  });
  testCases.push({
    table: 'monitoring_preferences',
    operation: 'horizontal_other_user_delete_denied',
    ...(await deleteDenied(admin, memberBClient, 'monitoring_preferences', ctx.seeds.monitoring_preferences.id)),
  });
  const selfPreference = await insertAllowed(memberBClient, 'monitoring_preferences', {
    organization_id: ctx.orgB.id,
    user_id: ctx.memberB.id,
    email: ctx.memberB.email,
    regulatory_change_alerts: true,
    monthly_review_reminders: false,
    low_score_alerts: true,
  });
  testCases.push({ table: 'monitoring_preferences', operation: 'horizontal_self_insert_allowed', ...selfPreference });
  if (selfPreference.insertedId) {
    ctx.created.rows.push(['monitoring_preferences', selfPreference.insertedId]);
    testCases.push({
      table: 'monitoring_preferences',
      operation: 'horizontal_self_read_allowed',
      ...(await readAllowed(memberBClient, 'monitoring_preferences', selfPreference.insertedId)),
    });
  } else {
    testCases.push({ table: 'monitoring_preferences', operation: 'horizontal_self_read_allowed', passed: false, returnedRows: 0, error: null });
  }

  testCases.push({
    table: 'notifications',
    operation: 'horizontal_recipient_read_allowed',
    ...(await readAllowed(ownerBClient, 'notifications', ctx.ownerNotification.id)),
  });
  testCases.push({
    table: 'notifications',
    operation: 'horizontal_other_user_read_denied',
    ...(await readDenied(memberBClient, 'notifications', ctx.ownerNotification.id)),
  });
  testCases.push({
    table: 'notifications',
    operation: 'horizontal_other_user_update_denied',
    ...(await updateDenied(admin, memberBClient, 'notifications', ctx.ownerNotification.id, { read_at: now() })),
  });
  testCases.push({
    table: 'notifications',
    operation: 'horizontal_other_user_delete_denied',
    ...(await deleteDenied(admin, memberBClient, 'notifications', ctx.ownerNotification.id)),
  });
  testCases.push({
    table: 'notifications',
    operation: 'horizontal_authenticated_insert_denied',
    ...(await insertDenied(memberBClient, 'notifications', {
      organization_id: ctx.orgB.id,
      user_id: ctx.memberB.id,
      title: `horizontal-member-insert-${ctx.suffix}`,
      message: 'must remain backend owned',
      type: 'info',
    })),
  });

  testCases.push({
    table: 'onboarding_activation_runs',
    operation: 'horizontal_member_read_allowed',
    ...(await readAllowed(memberBClient, 'onboarding_activation_runs', ctx.seeds.onboarding_activation_runs.id)),
  });
  testCases.push({
    table: 'onboarding_activation_runs',
    operation: 'horizontal_member_insert_denied',
    ...(await insertDenied(memberBClient, 'onboarding_activation_runs', {
      organization_id: ctx.orgB.id,
      created_by: ctx.memberB.id,
      country: 'PT',
      company_type: 'startup',
      sector: 'technology',
      ai_usage_level: 'active',
      initial_risk_level: 'limited',
      readiness_score: 13,
      status: 'completed',
    })),
  });
  testCases.push({
    table: 'onboarding_activation_runs',
    operation: 'horizontal_member_update_denied',
    ...(await updateDenied(admin, memberBClient, 'onboarding_activation_runs', ctx.seeds.onboarding_activation_runs.id, { readiness_score: 7 })),
  });
  testCases.push({
    table: 'onboarding_activation_runs',
    operation: 'horizontal_member_delete_denied',
    ...(await deleteDenied(admin, memberBClient, 'onboarding_activation_runs', ctx.seeds.onboarding_activation_runs.id)),
  });
}

async function runAiAssessmentTests(admin, clients, ctx, inventory, testCases) {
  testCases.push(rlsCase('ai_assessments', inventory, true));

  testCases.push({
    table: 'ai_assessments',
    operation: 'cross_tenant_read',
    ...(await readDenied(clients.ownerAClient, 'ai_assessments', ctx.assessmentB.id)),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'cross_tenant_insert',
    ...(await insertDenied(clients.ownerAClient, 'ai_assessments', {
      organization_id: ctx.orgB.id,
      created_by: ctx.ownerA.id,
      title: `cross-ai-assessment-${ctx.suffix}`,
      status: 'draft',
    })),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'cross_tenant_update',
    ...(await updateDenied(admin, clients.ownerAClient, 'ai_assessments', ctx.assessmentB.id, { title: `cross-mutated-${ctx.suffix}` })),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'cross_tenant_delete',
    ...(await deleteDenied(admin, clients.ownerAClient, 'ai_assessments', ctx.assessmentB.id)),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'same_tenant_read',
    ...(await readAllowed(clients.ownerBClient, 'ai_assessments', ctx.assessmentB.id)),
  });

  const ownerInsert = await insertAllowed(clients.ownerBClient, 'ai_assessments', {
    organization_id: ctx.orgB.id,
    created_by: ctx.ownerB.id,
    title: `owner-same-ai-assessment-${ctx.suffix}`,
    status: 'draft',
  });
  testCases.push({ table: 'ai_assessments', operation: 'same_tenant_insert', ...ownerInsert });
  if (ownerInsert.insertedId) ctx.created.rows.push(['ai_assessments', ownerInsert.insertedId]);

  const adminInsert = await insertAllowed(clients.adminBClient, 'ai_assessments', {
    organization_id: ctx.orgB.id,
    created_by: ctx.adminB.id,
    title: `admin-same-ai-assessment-${ctx.suffix}`,
    status: 'draft',
  });
  testCases.push({ table: 'ai_assessments', operation: 'admin_same_tenant_insert', ...adminInsert });
  if (adminInsert.insertedId) ctx.created.rows.push(['ai_assessments', adminInsert.insertedId]);

  testCases.push({
    table: 'ai_assessments',
    operation: 'member_same_tenant_read',
    ...(await readAllowed(clients.memberBClient, 'ai_assessments', ctx.assessmentB.id)),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'member_same_tenant_insert_denied',
    ...(await insertDenied(clients.memberBClient, 'ai_assessments', {
      organization_id: ctx.orgB.id,
      created_by: ctx.memberB.id,
      title: `member-denied-ai-assessment-${ctx.suffix}`,
      status: 'draft',
    })),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'member_same_tenant_update_denied',
    ...(await updateDenied(admin, clients.memberBClient, 'ai_assessments', ctx.assessmentB.id, { title: `member-mutated-${ctx.suffix}` })),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'member_same_tenant_delete_denied',
    ...(await deleteDenied(admin, clients.memberBClient, 'ai_assessments', ctx.assessmentB.id)),
  });

  testCases.push({
    table: 'ai_assessments',
    operation: 'viewer_same_tenant_read',
    ...(await readAllowed(clients.viewerAClient, 'ai_assessments', ctx.assessmentA.id)),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'viewer_same_tenant_insert_denied',
    ...(await insertDenied(clients.viewerAClient, 'ai_assessments', {
      organization_id: ctx.orgA.id,
      created_by: ctx.viewerA.id,
      title: `viewer-denied-ai-assessment-${ctx.suffix}`,
      status: 'draft',
    })),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'viewer_same_tenant_update_denied',
    ...(await updateDenied(admin, clients.viewerAClient, 'ai_assessments', ctx.assessmentA.id, { title: `viewer-mutated-${ctx.suffix}` })),
  });
  testCases.push({
    table: 'ai_assessments',
    operation: 'viewer_same_tenant_delete_denied',
    ...(await deleteDenied(admin, clients.viewerAClient, 'ai_assessments', ctx.assessmentA.id)),
  });
}

async function runPostV20Boundaries(admin, anon, clients, ctx, testCases) {
  testCases.push({
    table: 'ai_systems',
    operation: 'unlicensed_same_tenant_read_denied',
    ...(await readDenied(clients.unlicensedClient, 'ai_systems', ctx.aiUnlicensed.id)),
  });
  testCases.push({
    table: 'ai_systems',
    operation: 'unlicensed_same_tenant_insert_denied',
    ...(await insertDenied(clients.unlicensedClient, 'ai_systems', {
      organization_id: ctx.orgU.id,
      name: `unlicensed-insert-${ctx.suffix}`,
      use_case: 'payment-first negative proof',
      created_by: ctx.ownerU.id,
    })),
  });
  testCases.push({
    table: 'ai_systems',
    operation: 'anonymous_paid_table_read_denied',
    ...(await readDenied(anon, 'ai_systems', ctx.seeds.ai_systems.id)),
  });
  testCases.push({
    table: 'regulatory_updates',
    operation: 'authenticated_read_denied',
    ...(await readDenied(clients.ownerBClient, 'regulatory_updates', ctx.regulatory.id)),
  });
  testCases.push({
    table: 'regulatory_updates',
    operation: 'authenticated_insert_denied',
    ...(await insertDenied(clients.ownerBClient, 'regulatory_updates', {
      title: `forbidden-regulatory-${ctx.suffix}`,
      summary: 'must remain backend owned',
      severity: 'low',
      source_url: `https://example.com/forbidden/${ctx.suffix}`,
      published_at: now(),
    })),
  });
  testCases.push({
    table: 'regulatory_updates',
    operation: 'authenticated_update_denied',
    ...(await updateDenied(admin, clients.ownerBClient, 'regulatory_updates', ctx.regulatory.id, { title: `forbidden-update-${ctx.suffix}` })),
  });
  testCases.push({
    table: 'regulatory_updates',
    operation: 'authenticated_delete_denied',
    ...(await deleteDenied(admin, clients.ownerBClient, 'regulatory_updates', ctx.regulatory.id)),
  });
  testCases.push({
    table: 'regulatory_updates',
    operation: 'service_role_read_allowed',
    ...(await readAllowed(admin, 'regulatory_updates', ctx.regulatory.id)),
  });

  const inventoryDenied = await clients.ownerBClient.rpc('eurocomply_live_rls_inventory', {
    table_names: ['ai_systems'],
  });
  testCases.push({
    table: 'eurocomply_live_rls_inventory',
    operation: 'authenticated_execute_denied',
    passed: isExpectedDenial(inventoryDenied.error),
    returnedRows: Array.isArray(inventoryDenied.data) ? inventoryDenied.data.length : 0,
    error: safeError(inventoryDenied.error),
  });

  const legacyEvidence = await clients.ownerBClient.from('compliance_evidence').select('id').limit(1);
  testCases.push({
    table: 'compliance_evidence',
    operation: 'authenticated_read_denied',
    passed: isExpectedDenial(legacyEvidence.error),
    returnedRows: Array.isArray(legacyEvidence.data) ? legacyEvidence.data.length : 0,
    error: safeError(legacyEvidence.error),
  });

  testCases.push({
    table: 'evidence_items',
    operation: 'unlicensed_insert_denied',
    ...(await insertDenied(clients.unlicensedClient, 'evidence_items', {
      organization_id: ctx.orgU.id,
      user_id: ctx.ownerU.id,
      title: 'Forbidden unlicensed Evidence Vault insert',
      evidence_type: 'document',
      status: 'draft',
      article_refs: [],
    })),
  });

  const { data: bucket, error: bucketError } = await admin.storage.getBucket('compliance-evidence');
  testCases.push({
    table: 'storage.buckets',
    operation: 'compliance_evidence_private',
    passed: !bucketError && bucket?.public === false,
    returnedRows: bucket ? 1 : 0,
    error: safeError(bucketError),
  });

  const orphanEvidenceId = crypto.randomUUID();
  const orphanUpload = await clients.ownerBClient.storage.from('compliance-evidence').upload(
    `${ctx.orgB.id}/${orphanEvidenceId}/orphan.txt`,
    Buffer.from('bounded post-v20 live RLS proof\n', 'utf8'),
    { upsert: false, contentType: 'text/plain' },
  );
  testCases.push({
    table: 'storage.objects',
    operation: 'orphan_evidence_insert_denied',
    passed: isExpectedDenial(orphanUpload.error),
    returnedRows: orphanUpload.data ? 1 : 0,
    error: safeError(orphanUpload.error),
  });
}

export async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('github_actions_required');

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const commitSha = getCommitSha();
  assert(/^[a-f0-9]{40}$/.test(commitSha), 'exact_commit_sha_required');
  assert(/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(url), 'live_supabase_project_url_required');
  assert(/^\d+$/.test(String(process.env.PROMOTION_RUN_ID ?? '')), 'promotion_run_id_required');

  const admin = client(url, serviceRoleKey);
  const anon = client(url, anonKey);
  const clients = {
    ownerAClient: client(url, anonKey),
    viewerAClient: client(url, anonKey),
    ownerBClient: client(url, anonKey),
    adminBClient: client(url, anonKey),
    memberBClient: client(url, anonKey),
    unlicensedClient: client(url, anonKey),
  };

  let ctx;
  let proofError;
  let cleanupError;
  let testCases = [];

  try {
    const inventoryTargets = [...new Set([
      ...customerTenantTables,
      ...globalReferenceTables,
      'ai_assessments',
      'evidence_items',
    ])];
    const inventory = await loadInventory(admin, inventoryTargets);
    testCases.push(...customerTenantTables.map((table) =>
      rlsCase(table, inventory, requiredCommercialForceRlsTables.includes(table))));
    testCases.push(rlsCase('regulatory_updates', inventory, false));

    for (const table of requiredCommercialForceRlsTables) {
      const row = inventory.find((entry) => entry?.table_name === table);
      if (!row || row.exists !== true || row.rls_enabled !== true || row.force_rls !== true) {
        throw new Error(`required_commercial_force_rls_missing:${table}`);
      }
    }

    ctx = await setup(admin);
    await signIn(clients.ownerAClient, ctx.ownerA, ctx.password, 'owner_a');
    await signIn(clients.viewerAClient, ctx.viewerA, ctx.password, 'viewer_a');
    await signIn(clients.ownerBClient, ctx.ownerB, ctx.password, 'owner_b');
    await signIn(clients.adminBClient, ctx.adminB, ctx.password, 'admin_b');
    await signIn(clients.memberBClient, ctx.memberB, ctx.password, 'member_b');
    await signIn(clients.unlicensedClient, ctx.ownerU, ctx.password, 'unlicensed');

    for (const table of customerTenantTables) {
      const spec = specFor(table, ctx);
      assert(spec?.seed?.id, `missing_fixture_spec:${table}`);
      testCases.push({ table, operation: 'cross_tenant_read', ...(await readDenied(clients.ownerAClient, table, spec.seed.id)) });
      testCases.push({ table, operation: 'cross_tenant_insert', ...(await insertDenied(clients.ownerAClient, table, spec.insert)) });
      testCases.push({ table, operation: 'cross_tenant_update', ...(await updateDenied(admin, clients.ownerAClient, table, spec.seed.id, spec.update)) });
      testCases.push({ table, operation: 'cross_tenant_delete', ...(await deleteDenied(admin, clients.ownerAClient, table, spec.seed.id)) });
      testCases.push({
        table,
        operation: backendOwnedTables.includes(table) ? 'same_tenant_read_backend_only' : 'same_tenant_read',
        ...(await readAllowed(clients.ownerBClient, table, spec.seed.id)),
      });

      if (sameTenantWritableTables.includes(table) && spec.sameInsert) {
        const result = await insertAllowed(clients.ownerBClient, table, spec.sameInsert);
        testCases.push({ table, operation: 'same_tenant_insert', ...result });
        if (result.insertedId) ctx.created.rows.push([table, result.insertedId]);
      }

      if (backendOwnedTables.includes(table) && spec.sameDeniedInsert) {
        for (const operation of requiredBackendWriteDenyOperations) {
          if (operation === 'same_tenant_insert_denied') {
            testCases.push({ table, operation, ...(await insertDenied(clients.ownerBClient, table, spec.sameDeniedInsert)) });
          }
          if (operation === 'same_tenant_update_denied') {
            testCases.push({ table, operation, ...(await updateDenied(admin, clients.ownerBClient, table, spec.seed.id, spec.update)) });
          }
          if (operation === 'same_tenant_delete_denied') {
            testCases.push({ table, operation, ...(await deleteDenied(admin, clients.ownerBClient, table, spec.seed.id)) });
          }
        }
      }
    }

    const viewerMembershipSpec = {
      organization_id: ctx.orgInsertTarget.id,
      user_id: ctx.viewerA.id,
      role: 'admin',
    };
    testCases.push({
      table: 'organization_members',
      operation: requiredViewerAdminDenyOperations[0],
      ...(await insertDenied(clients.viewerAClient, 'organization_members', viewerMembershipSpec)),
    });
    testCases.push({
      table: 'organization_members',
      operation: requiredViewerAdminDenyOperations[1],
      ...(await updateDenied(admin, clients.viewerAClient, 'organization_members', ctx.seeds.organization_members.id, { role: 'admin' })),
    });
    testCases.push({
      table: 'organization_members',
      operation: requiredViewerAdminDenyOperations[2],
      ...(await deleteDenied(admin, clients.viewerAClient, 'organization_members', ctx.seeds.organization_members.id)),
    });

    await runHorizontalTests(admin, clients, ctx, testCases);
    await runAiAssessmentTests(admin, clients, ctx, inventory, testCases);
    await runPostV20Boundaries(admin, anon, clients, ctx, testCases);

    for (const operation of requiredGlobalReferenceOperations) {
      assert(
        testCases.some((test) => test.table === 'regulatory_updates' && test.operation === operation && test.passed === true),
        `missing_regulatory_backend_only_operation:${operation}`,
      );
    }
    for (const operation of requiredSameTenantReadOperations) {
      if (operation === 'same_tenant_read') break;
    }

    const failed = testCases.filter((test) => test.passed !== true);
    if (failed.length > 0) {
      throw new Error(`post_v20_live_rls_failed:${failed.map((test) => `${test.table}:${test.operation}`).join(',')}`);
    }

    const evidence = buildEvidencePayload({
      status: 'Complete',
      outcome: 'passed',
      supabaseUrl: url,
      command: commandUsed(),
      commitSha,
      testCases,
      failures: [],
      tablesReviewed: tableCoverageFrom(testCases),
      serviceRolePaths: serviceRolePaths(),
      extra: {
        horizontalIsolation: {
          status: 'passed',
          sameTenantDistinctUsers: true,
          checkedAt: now(),
          testedTables: ['monitoring_preferences', 'notifications', 'onboarding_activation_runs'],
        },
        paymentFirstV20: {
          licensedTenantsProved: true,
          unlicensedSameTenantDenied: true,
          anonymousPaidSurfaceDenied: true,
          regulatoryUpdatesBackendOnly: true,
          providerEventsCreated: false,
          stripeLifecycleSynthesized: false,
        },
        evidenceVaultV20: {
          unlicensedMetadataInsertDenied: true,
          privateBucketProved: true,
          orphanStorageInsertDenied: true,
          livePositiveAttachmentLifecycleCoveredByDisposableDataPlaneProof: true,
        },
        aiAssessmentsLiveValidation: {
          status: 'Complete',
          outcome: 'passed',
          roleCoverage: ['owner', 'admin', 'member', 'viewer'],
          crossTenantAccessDenied: true,
        },
      },
    });

    const baseValidation = validatePassingEvidence(evidence);
    if (!baseValidation.valid) {
      throw new Error(`generated_v20_evidence_invalid:${baseValidation.errors.join(';')}`);
    }
    const horizontalValidation = validateHorizontalIsolationEvidence(evidence);
    if (!horizontalValidation.valid) {
      throw new Error(`generated_horizontal_evidence_invalid:${horizontalValidation.errors.join(';')}`);
    }

    writeEvidence(evidence);
  } catch (error) {
    proofError = error instanceof Error ? error : new Error(String(error));
  }

  if (ctx?.created) {
    try {
      const cleanup = await cleanupV20SyntheticFixture(admin, ctx.created);
      if (!cleanup.cleanupPassed) throw new Error('fixture_cleanup_not_confirmed');
    } catch (error) {
      cleanupError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (proofError || cleanupError) {
    const failure = [proofError?.message, cleanupError?.message].filter(Boolean).join('; ');
    writeEvidence(buildEvidencePayload({
      status: 'Open',
      outcome: 'failed',
      supabaseUrl: url,
      command: commandUsed(),
      commitSha,
      testCases,
      failures: [failure],
      tablesReviewed: tableCoverageFrom(testCases),
      serviceRolePaths: serviceRolePaths(),
      extra: {
        horizontalIsolation: {
          status: 'failed',
          sameTenantDistinctUsers: true,
          checkedAt: now(),
          testedTables: ['monitoring_preferences', 'notifications', 'onboarding_activation_runs'],
        },
        blockingReason: failure,
        cleanupPassed: !cleanupError,
      },
    }));
    throw new Error(failure || 'post_v20_live_rls_failed');
  }

  process.stdout.write('Supabase post-V20 live RLS validation: Complete/passed\n');
}

const isCli = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
