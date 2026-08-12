#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { tableCoverageFrom } from './supabase-live-rls-evidence.mjs';
import { validateHorizontalIsolationEvidence } from './supabase-horizontal-rls-evidence.mjs';

const evidencePath = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const authOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const expectedDenialText = /(row-level security|permission denied|not authorized|unauthorized|forbidden|new row violates)/i;

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function safeError(error) {
  if (!error) return null;
  return {
    code: String(error.code ?? 'unknown'),
    message: String(error.message ?? 'error').slice(0, 180),
  };
}

function rowCount(data) {
  return Array.isArray(data) ? data.length : data ? 1 : 0;
}

function result(passed, data, error, extra = {}) {
  return {
    passed,
    returnedRows: rowCount(data),
    error: safeError(error),
    ...extra,
  };
}

function buildClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing = [
    ['NEXT_PUBLIC_SUPABASE_URL', url],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon],
    ['SUPABASE_SERVICE_ROLE_KEY', service],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Horizontal RLS proof requires protected runtime configuration: ${missing.join(', ')}`);
  }

  return {
    admin: createClient(url, service, authOptions),
    owner: createClient(url, anon, authOptions),
    member: createClient(url, anon, authOptions),
  };
}

async function createUser(admin, label, suffix, password, createdUsers) {
  const email = `rls-${label}-${suffix}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Failed to create ${label} horizontal RLS user: ${error?.message ?? 'missing user'}`);
  createdUsers.push(data.user.id);
  return { id: data.user.id, email };
}

async function signIn(client, user, password) {
  const { data, error } = await client.auth.signInWithPassword({ email: user.email, password });
  if (error || !data.session) throw new Error(`Failed to authenticate horizontal RLS fixture user: ${error?.message ?? 'missing session'}`);
}

async function insertOne(admin, table, payload, createdRows) {
  const { data, error } = await admin.from(table).insert(payload).select('*').single();
  if (error || !data?.id) throw new Error(`Failed to seed ${table} horizontal RLS fixture: ${error?.message ?? 'missing id'}`);
  createdRows.push([table, data.id]);
  return data;
}

async function readExpected(client, table, id, visible) {
  const { data, error } = await client.from(table).select('id').eq('id', id);
  const count = rowCount(data);
  return result(!error && count === (visible ? 1 : 0), data, error, { expectedVisible: visible });
}

async function updateDenied(admin, client, table, id, patch, field, originalValue) {
  const { data, error } = await client.from(table).update(patch).eq('id', id).select('id');
  const { data: observed, error: verifyError } = await admin.from(table).select(`id,${field}`).eq('id', id).single();
  if (verifyError) return result(false, data, verifyError, { mutationError: safeError(error) });
  const unchanged = Object.is(observed?.[field] ?? null, originalValue ?? null);
  return result(unchanged, data, error, { unchangedAfterAttempt: unchanged });
}

async function deleteDenied(admin, client, table, id) {
  const { data, error } = await client.from(table).delete().eq('id', id).select('id');
  const { data: observed, error: verifyError } = await admin.from(table).select('id').eq('id', id).maybeSingle();
  if (verifyError) return result(false, data, verifyError, { mutationError: safeError(error) });
  return result(Boolean(observed?.id), data, error, { rowStillExists: Boolean(observed?.id) });
}

async function notificationInsertDenied(admin, client, payload) {
  const { data, error } = await client.from('notifications').insert(payload).select('id');
  const { data: observed, error: verifyError } = await admin
    .from('notifications')
    .select('id')
    .eq('organization_id', payload.organization_id)
    .eq('title', payload.title);
  if (verifyError) return result(false, data, verifyError, { mutationError: safeError(error) });
  return result(rowCount(observed) === 0, data, error, { persistedRowsAfterAttempt: rowCount(observed) });
}

async function onboardingInsertDenied(admin, client, payload) {
  const { data, error } = await client.from('onboarding_activation_runs').insert(payload).select('id');
  const { data: observed, error: verifyError } = await admin
    .from('onboarding_activation_runs')
    .select('id')
    .eq('organization_id', payload.organization_id)
    .eq('created_by', payload.created_by)
    .eq('readiness_score', payload.readiness_score);
  if (verifyError) return result(false, data, verifyError, { mutationError: safeError(error) });
  return result(rowCount(observed) === 0, data, error, { persistedRowsAfterAttempt: rowCount(observed) });
}

async function monitoringSelfInsertAllowed(memberClient, payload, createdRows) {
  const { data, error } = await memberClient.from('monitoring_preferences').insert(payload).select('id');
  const insertedId = Array.isArray(data) ? data[0]?.id : data?.id;
  if (insertedId) createdRows.push(['monitoring_preferences', insertedId]);
  return { proof: result(!error && Boolean(insertedId), data, error), insertedId };
}

async function cleanup(admin, createdRows, createdUsers) {
  for (const [table, id] of [...createdRows].reverse()) {
    try {
      await admin.from(table).delete().eq('id', id);
    } catch {}
  }
  for (const userId of [...createdUsers].reverse()) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {}
  }
}

function appendEvidence(horizontalTests) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const priorTests = Array.isArray(evidence.testCases)
    ? evidence.testCases.filter((test) => !String(test?.operation ?? '').startsWith('horizontal_'))
    : [];
  const testCases = [...priorTests, ...horizontalTests];
  const horizontalFailures = horizontalTests.filter((test) => test.passed !== true);
  const controlsVerified = Array.from(new Set([
    ...(Array.isArray(evidence.controlsVerified) ? evidence.controlsVerified : []),
    'Same-tenant horizontal recipient isolation verified',
    'Per-user monitoring preference confidentiality verified',
    'Member versus writer/admin onboarding mutation boundary verified',
  ]));

  const updated = {
    ...evidence,
    controlsVerified,
    horizontalIsolation: {
      status: horizontalFailures.length === 0 ? 'passed' : 'failed',
      sameTenantDistinctUsers: true,
      checkedAt: now(),
      testedTables: ['monitoring_preferences', 'notifications', 'onboarding_activation_runs'],
    },
    testCases,
    testsRun: testCases.map((test) => `${test.table}:${test.operation}`),
    testsPassed: testCases.filter((test) => test.passed === true).map((test) => `${test.table}:${test.operation}`),
    testsFailed: testCases.filter((test) => test.passed !== true).map((test) => `${test.table}:${test.operation}`),
    failures: horizontalFailures.length === 0
      ? (Array.isArray(evidence.failures) ? evidence.failures : [])
      : [
          ...(Array.isArray(evidence.failures) ? evidence.failures : []),
          ...horizontalFailures.map((test) => `${test.table}:${test.operation}`),
        ],
    tablesReviewed: tableCoverageFrom(testCases),
  };

  fs.writeFileSync(evidencePath, `${JSON.stringify(updated, null, 2)}\n`);
  const validation = validateHorizontalIsolationEvidence(updated);
  if (!validation.valid) throw new Error(`Horizontal RLS evidence invalid: ${validation.errors.join(', ')}`);
  return updated;
}

export async function main() {
  if (!fs.existsSync(evidencePath)) throw new Error(`Base Supabase RLS evidence is missing: ${evidencePath}`);

  const { admin, owner, member } = buildClients();
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const password = `Rls!${crypto.randomBytes(18).toString('base64url')}9aA`;
  const createdRows = [];
  const createdUsers = [];
  const tests = [];

  try {
    const ownerUser = await createUser(admin, 'horizontal-owner', suffix, password, createdUsers);
    const memberUser = await createUser(admin, 'horizontal-member', suffix, password, createdUsers);
    const org = await insertOne(admin, 'organizations', {
      name: `Horizontal RLS ${suffix}`,
      slug: `horizontal-rls-${suffix}`,
      created_by: ownerUser.id,
    }, createdRows);

    await insertOne(admin, 'organization_members', { organization_id: org.id, user_id: ownerUser.id, role: 'owner' }, createdRows);
    await insertOne(admin, 'organization_members', { organization_id: org.id, user_id: memberUser.id, role: 'member' }, createdRows);

    const ownerPreference = await insertOne(admin, 'monitoring_preferences', {
      organization_id: org.id,
      user_id: ownerUser.id,
      email: ownerUser.email,
      regulatory_change_alerts: true,
      monthly_review_reminders: true,
      low_score_alerts: true,
    }, createdRows);

    const ownerNotification = await insertOne(admin, 'notifications', {
      organization_id: org.id,
      user_id: ownerUser.id,
      title: `horizontal-owner-notification-${suffix}`,
      message: 'horizontal isolation proof',
      type: 'info',
    }, createdRows);

    const onboarding = await insertOne(admin, 'onboarding_activation_runs', {
      organization_id: org.id,
      created_by: ownerUser.id,
      country: 'PT',
      company_type: 'startup',
      sector: 'technology',
      ai_usage_level: 'active',
      initial_risk_level: 'limited',
      readiness_score: 42,
      status: 'completed',
    }, createdRows);

    await signIn(owner, ownerUser, password);
    await signIn(member, memberUser, password);

    tests.push({ table: 'monitoring_preferences', operation: 'horizontal_other_user_read_denied', ...(await readExpected(member, 'monitoring_preferences', ownerPreference.id, false)) });
    tests.push({ table: 'monitoring_preferences', operation: 'horizontal_other_user_update_denied', ...(await updateDenied(admin, member, 'monitoring_preferences', ownerPreference.id, { low_score_alerts: false }, 'low_score_alerts', true)) });
    tests.push({ table: 'monitoring_preferences', operation: 'horizontal_other_user_delete_denied', ...(await deleteDenied(admin, member, 'monitoring_preferences', ownerPreference.id)) });

    const selfPreferencePayload = {
      organization_id: org.id,
      user_id: memberUser.id,
      email: memberUser.email,
      regulatory_change_alerts: true,
      monthly_review_reminders: false,
      low_score_alerts: true,
    };
    const selfInsert = await monitoringSelfInsertAllowed(member, selfPreferencePayload, createdRows);
    tests.push({ table: 'monitoring_preferences', operation: 'horizontal_self_insert_allowed', ...selfInsert.proof });
    tests.push({ table: 'monitoring_preferences', operation: 'horizontal_self_read_allowed', ...(selfInsert.insertedId ? await readExpected(member, 'monitoring_preferences', selfInsert.insertedId, true) : result(false, null, null)) });

    tests.push({ table: 'notifications', operation: 'horizontal_recipient_read_allowed', ...(await readExpected(owner, 'notifications', ownerNotification.id, true)) });
    tests.push({ table: 'notifications', operation: 'horizontal_other_user_read_denied', ...(await readExpected(member, 'notifications', ownerNotification.id, false)) });
    tests.push({ table: 'notifications', operation: 'horizontal_other_user_update_denied', ...(await updateDenied(admin, member, 'notifications', ownerNotification.id, { read_at: now() }, 'read_at', ownerNotification.read_at ?? null)) });
    tests.push({ table: 'notifications', operation: 'horizontal_other_user_delete_denied', ...(await deleteDenied(admin, member, 'notifications', ownerNotification.id)) });
    tests.push({ table: 'notifications', operation: 'horizontal_authenticated_insert_denied', ...(await notificationInsertDenied(admin, member, {
      organization_id: org.id,
      user_id: memberUser.id,
      title: `horizontal-member-insert-${suffix}`,
      message: 'must remain backend owned',
      type: 'info',
    })) });

    tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_read_allowed', ...(await readExpected(member, 'onboarding_activation_runs', onboarding.id, true)) });
    tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_insert_denied', ...(await onboardingInsertDenied(admin, member, {
      organization_id: org.id,
      created_by: memberUser.id,
      country: 'PT',
      company_type: 'startup',
      sector: 'technology',
      ai_usage_level: 'active',
      initial_risk_level: 'limited',
      readiness_score: 13,
      status: 'completed',
    })) });
    tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_update_denied', ...(await updateDenied(admin, member, 'onboarding_activation_runs', onboarding.id, { readiness_score: 7 }, 'readiness_score', 42)) });
    tests.push({ table: 'onboarding_activation_runs', operation: 'horizontal_member_delete_denied', ...(await deleteDenied(admin, member, 'onboarding_activation_runs', onboarding.id)) });

    const failed = tests.filter((test) => !test.passed);
    appendEvidence(tests);
    if (failed.length > 0) {
      throw new Error(`Horizontal RLS validation failed: ${failed.map((test) => `${test.table}:${test.operation}`).join(', ')}`);
    }

    console.log(`Horizontal RLS validation passed with ${tests.length} same-tenant assertions.`);
  } finally {
    await cleanup(admin, createdRows, createdUsers);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(expectedDenialText.test(message) ? 'Horizontal RLS proof failed closed.' : message);
    process.exit(1);
  });
}
