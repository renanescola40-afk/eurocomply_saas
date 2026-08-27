#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const API = 'https://api.supabase.com/v1';
const PROJECT_REF = /^[a-z0-9]{20}$/;

function required(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function sourceRefFromUrl(value) {
  const url = new URL(value);
  const match = url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (!match) throw new Error('source_supabase_url_not_canonical');
  return match[1];
}

async function api(path, method = 'GET') {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${required('SUPABASE_ACCESS_TOKEN')}`,
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`supabase_management_api_${response.status}`);
  return text ? JSON.parse(text) : null;
}

function field(project, ...names) {
  for (const name of names) if (project?.[name] != null) return String(project[name]);
  return '';
}

export function allowedDestroyConfirmations(restoreRef) {
  if (!PROJECT_REF.test(String(restoreRef ?? ''))) return [];
  return [
    `DELETE ${restoreRef} AFTER REHEARSAL`,
    `DELETE ${restoreRef} AFTER RECOVERY PROOF`,
  ];
}

async function main() {
  if (required('RECOVERY_PROVIDER_RESTORE_ATTESTATION') !== 'SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED') {
    throw new Error('provider_restore_attestation_missing');
  }

  const sourceRef = sourceRefFromUrl(required('NEXT_PUBLIC_SUPABASE_URL'));
  const restoreRef = required('RECOVERY_PROVIDER_RESTORE_PROJECT_REF');
  if (!PROJECT_REF.test(restoreRef) || restoreRef === sourceRef) throw new Error('restore_project_ref_invalid_or_not_distinct');

  const confirmation = required('RECOVERY_PROVIDER_DESTROY_CONFIRMATION');
  if (!allowedDestroyConfirmations(restoreRef).includes(confirmation)) {
    throw new Error('restore_cleanup_confirmation_mismatch');
  }

  const [source, restore] = await Promise.all([
    api(`/projects/${sourceRef}`),
    api(`/projects/${restoreRef}`),
  ]);
  const sourceOrg = field(source, 'organization_id', 'organization_slug');
  const restoreOrg = field(restore, 'organization_id', 'organization_slug');
  const sourceRegion = field(source, 'region');
  const restoreRegion = field(restore, 'region');
  if (!sourceOrg || sourceOrg !== restoreOrg) throw new Error('restore_cleanup_organization_mismatch');
  if (!sourceRegion || sourceRegion !== restoreRegion) throw new Error('restore_cleanup_region_mismatch');

  await api(`/projects/${restoreRef}`, 'DELETE');
  process.stdout.write(`${JSON.stringify({ outcome: 'destroyed', sourceProtected: true, restoreProjectReferenceStored: false })}\n`);
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === executedPath) {
  main().catch((error) => {
    console.error(JSON.stringify({ outcome: 'failed', failure: error instanceof Error ? error.message : 'unknown_failure' }));
    process.exit(1);
  });
}