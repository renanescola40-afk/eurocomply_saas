#!/usr/bin/env node
// Fail-closed local-only synthetic RLS SELECT proof. This script never writes tenant data.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { assertLocalSupabaseTarget } from './assert-local-supabase-target.mjs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fixtureEmailPattern = /^[a-z0-9._+-]+@example\.(?:com|test)$/i;

export function validatedFixture(env) {
  const { target } = assertLocalSupabaseTarget(env);
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_ACCESS_TOKEN']) {
    if (String(env[name] || '').trim()) throw new Error('Privileged credential must not be present: ' + name);
  }
  const mandatory = [
    'LOCAL_RLS_ANON_KEY', 'LOCAL_RLS_A_EMAIL', 'LOCAL_RLS_A_PASSWORD', 'LOCAL_RLS_B_EMAIL',
    'LOCAL_RLS_B_PASSWORD', 'LOCAL_RLS_A_ORG_ID', 'LOCAL_RLS_B_ORG_ID',
    'LOCAL_RLS_A_DOCUMENT_ID', 'LOCAL_RLS_B_DOCUMENT_ID',
  ];
  for (const name of mandatory) {
    if (!String(env[name] || '').trim()) throw new Error('Missing local synthetic fixture field: ' + name);
  }
  for (const letter of ['A', 'B']) {
    if (!fixtureEmailPattern.test(env['LOCAL_RLS_' + letter + '_EMAIL'])) {
      throw new Error('Non-synthetic fixture email: ' + letter);
    }
    for (const name of ['ORG_ID', 'DOCUMENT_ID']) {
      if (!uuidPattern.test(env['LOCAL_RLS_' + letter + '_' + name])) {
        throw new Error('Invalid fixture UUID: ' + letter + '_' + name);
      }
    }
  }
  if (env.LOCAL_RLS_A_EMAIL.toLowerCase() === env.LOCAL_RLS_B_EMAIL.toLowerCase()) {
    throw new Error('Fixture users must differ');
  }
  for (const name of ['ORG_ID', 'DOCUMENT_ID']) {
    if (env['LOCAL_RLS_A_' + name].toLowerCase() === env['LOCAL_RLS_B_' + name].toLowerCase()) {
      throw new Error('Fixture ' + name + ' must differ');
    }
  }
  return {
    target, anonKey: env.LOCAL_RLS_ANON_KEY,
    identities: ['A', 'B'].map(label => ({
      label, email: env['LOCAL_RLS_' + label + '_EMAIL'],
      password: env['LOCAL_RLS_' + label + '_PASSWORD'],
      orgId: env['LOCAL_RLS_' + label + '_ORG_ID'],
      documentId: env['LOCAL_RLS_' + label + '_DOCUMENT_ID'],
    })),
  };
}

export function assertReadProofResponse(value, expected, label) {
  if (value.status === 401 || value.status === 403) {
    if (expected === 'deny') return;
    throw new Error(label + ': authorized read rejected (' + value.status + ')');
  }
  if (value.status !== 200 || !Array.isArray(value.rows)) {
    throw new Error(label + ': invalid or unsuccessful query');
  }
  if (expected === 'deny') {
    if (value.rows.length !== 0) throw new Error(label + ': cross-tenant or anonymous row exposed');
    return;
  }
  if (value.rows.length !== 1 || value.rows[0]?.id !== expected.id ||
      value.rows[0]?.organization_id !== expected.orgId) {
    throw new Error(label + ': own-row visibility not proven');
  }
}

export async function executeReadProof(env = process.env, fetcher = fetch) {
  const fixture = validatedFixture(env);
  const base = fixture.target;
  const anonKey = fixture.anonKey;
  const request = async (endpoint, token = anonKey, body = undefined) => {
    const url = new URL(endpoint, base + '/');
    if (url.origin !== base || url.protocol !== 'http:') {
      throw new Error('Request attempted to leave local Supabase origin');
    }
    let response;
    try {
      response = await fetcher(url, {
        method: body ? 'POST' : 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: {
          apikey: anonKey, authorization: 'Bearer ' + token,
          ...(body ? {'content-type': 'application/json'} : {}),
        },
        ...(body ? {body: JSON.stringify(body)} : {}),
      });
    } catch {
      throw new Error('Local Supabase request failed (no cloud fallback)');
    }
    if (response.status === 401 || response.status === 403) {
      return {status: response.status, rows: null};
    }
    if (!response.ok) throw new Error('Local Supabase returned HTTP ' + response.status);
    return {status: response.status, rows: await response.json()};
  };
  const actors = [];
  for (const identity of fixture.identities) {
    const login = await request('/auth/v1/token?grant_type=password', anonKey, {
      email: identity.email, password: identity.password,
    });
    if (login.status !== 200 || !login.rows?.access_token ||
        !uuidPattern.test(login.rows?.user?.id || '')) {
      throw new Error('Local synthetic login failed: tenant ' + identity.label);
    }
    actors.push({...identity, token: login.rows.access_token, userId: login.rows.user.id});
  }
  if (actors[0].userId === actors[1].userId) {
    throw new Error('Tenant identities must have different user IDs');
  }
  const checks = [];
  const read = (table, params, token) => request(
    '/rest/v1/' + table + '?' + params.toString(), token,
  );
  for (const actor of actors) {
    const other = actors.find(x => x.label !== actor.label);
    const ownMembership = new URLSearchParams({
      select: 'id,organization_id', organization_id: 'eq.' + actor.orgId,
      user_id: 'eq.' + actor.userId,
    });
    const membership = await read('organization_members', ownMembership, actor.token);
    if (membership.status !== 200 || !Array.isArray(membership.rows) ||
        membership.rows.length !== 1 ||
        membership.rows[0]?.organization_id !== actor.orgId) {
      throw new Error(actor.label + ': own active-membership fixture not visible');
    }
    checks.push(actor.label + ': own membership visible');
    const foreignMembership = new URLSearchParams({
      select: 'id,organization_id', organization_id: 'eq.' + other.orgId,
      user_id: 'eq.' + other.userId,
    });
    assertReadProofResponse(
      await read('organization_members', foreignMembership, actor.token),
      'deny', actor.label + ': other membership',
    );
    checks.push(actor.label + ': foreign membership denied');
    for (const [subject, expected] of [
      [actor, {id: actor.documentId, orgId: actor.orgId}],
      [other, 'deny'],
    ]) {
      const params = new URLSearchParams({
        select: 'id,organization_id', id: 'eq.' + subject.documentId,
      });
      assertReadProofResponse(
        await read('documents', params, actor.token),
        expected, actor.label + ': ' + subject.label + ' document',
      );
      checks.push(actor.label + ': ' + subject.label + ' document ' +
        (expected === 'deny' ? 'denied' : 'visible'));
    }
  }
  for (const actor of actors) {
    const params = new URLSearchParams({
      select: 'id,organization_id', id: 'eq.' + actor.documentId,
    });
    assertReadProofResponse(
      await read('documents', params, anonKey), 'deny',
      'anon: ' + actor.label + ' document',
    );
    checks.push('anon: ' + actor.label + ' document denied');
  }
  return {
    status: 'PASS', scope: 'LOCAL_SYNTHETIC_READ_ONLY',
    checksPassed: checks.length, checks,
    verifiedAt: new Date().toISOString(),
  };
}

if (process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  executeReadProof().then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => {
      console.error('LOCAL TENANT PROOF BLOCKED: ' + error.message);
      process.exitCode = 1;
    });
}
