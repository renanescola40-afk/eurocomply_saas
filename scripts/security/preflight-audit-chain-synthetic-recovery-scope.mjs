#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import {
  MAX_SYNTHETIC_AUDIT_EVENTS,
  MAX_SYNTHETIC_ORGANIZATIONS,
  PROTECTED_ORGANIZATION_IDS,
  SYNTHETIC_AUDIT_ACTION,
  SYNTHETIC_SLUG_PREFIX,
  validateRecoveryWindow,
} from './recover-audit-chain-synthetic-residue.mjs';

const REQUEST_TIMEOUT_MS = 8_000;

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function timedFetch(input, init = {}) {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...init, signal });
}

function requireNoError(response, code) {
  if (response?.error) throw new Error(`${code}:${response.error.code || 'provider_error'}`);
  return response?.data ?? null;
}

export function assertAuditEventsBoundToSyntheticOrganizations(organizations, auditEvents) {
  if (!Array.isArray(organizations) || organizations.length > MAX_SYNTHETIC_ORGANIZATIONS) {
    throw new Error('organization_scope_too_large');
  }
  if (!Array.isArray(auditEvents) || auditEvents.length > MAX_SYNTHETIC_AUDIT_EVENTS) {
    throw new Error('audit_event_scope_too_large');
  }

  const organizationIds = new Set();
  for (const organization of organizations) {
    const id = String(organization?.id || '');
    const slug = String(organization?.slug || '');
    if (!id || !slug.startsWith(SYNTHETIC_SLUG_PREFIX) || PROTECTED_ORGANIZATION_IDS.has(id)) {
      throw new Error('organization_scope_not_synthetic');
    }
    organizationIds.add(id);
  }

  for (const event of auditEvents) {
    if (event?.action !== SYNTHETIC_AUDIT_ACTION) {
      throw new Error('audit_event_action_not_synthetic');
    }
    const organizationId = String(event?.organization_id || '');
    if (!organizationId || !organizationIds.has(organizationId)) {
      throw new Error('audit_event_scope_not_bound_to_synthetic_organization');
    }
  }

  return {
    organizationsMatched: organizations.length,
    auditEventsMatched: auditEvents.length,
  };
}

export async function runPreflight() {
  const { from, to } = validateRecoveryWindow(env('RECOVERY_FROM'), env('RECOVERY_TO'));
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('supabase_configuration_missing');

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: timedFetch },
  });

  const organizations = requireNoError(await admin
    .from('organizations')
    .select('id,slug,created_at')
    .like('slug', `${SYNTHETIC_SLUG_PREFIX}%`)
    .gte('created_at', from)
    .lte('created_at', to)
    .limit(MAX_SYNTHETIC_ORGANIZATIONS + 1), 'organization_discovery_failed');

  const auditEvents = requireNoError(await admin
    .from('audit_events')
    .select('id,organization_id,action,created_at')
    .eq('action', SYNTHETIC_AUDIT_ACTION)
    .gte('created_at', from)
    .lte('created_at', to)
    .limit(MAX_SYNTHETIC_AUDIT_EVENTS + 1), 'audit_event_discovery_failed');

  const result = assertAuditEventsBoundToSyntheticOrganizations(
    Array.isArray(organizations) ? organizations : [],
    Array.isArray(auditEvents) ? auditEvents : [],
  );

  console.log(`Synthetic recovery scope preflight passed; organizations=${result.organizationsMatched}, auditEvents=${result.auditEventsMatched}.`);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPreflight().catch((error) => {
    console.error(`Synthetic recovery scope preflight failed: ${String(error?.message || 'unknown_error').split(':', 1)[0]}.`);
    process.exitCode = 1;
  });
}
