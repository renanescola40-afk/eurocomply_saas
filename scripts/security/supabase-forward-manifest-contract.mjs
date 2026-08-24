#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export const FORWARD_MANIFEST_PATH = 'config/supabase-forward-reconciliation.json';
export const LIVE_RLS_EVIDENCE_SCHEMA = 'risck-comply.supabase-live-rls-validation.forward-promotion.v1';

export function loadForwardManifestContract(path = FORWARD_MANIFEST_PATH) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (parsed?.schema !== 'risck-comply.supabase-forward-reconciliation-config.v1') {
    throw new Error('unexpected forward reconciliation config schema');
  }
  if (!String(parsed?.changeSet ?? '').trim()) throw new Error('forward reconciliation changeSet is required');
  if (!Array.isArray(parsed?.migrations) || parsed.migrations.length < 1) {
    throw new Error('forward reconciliation migrations must be non-empty');
  }
  const filenames = parsed.migrations.map((item) => String(item?.filename ?? '').trim());
  if (filenames.some((name) => !/^\d{14}_[A-Za-z0-9_.-]+\.sql$/.test(name))) {
    throw new Error('forward reconciliation contains an invalid migration filename');
  }
  if (new Set(filenames).size !== filenames.length) throw new Error('forward reconciliation contains duplicate migrations');

  const boundary = parsed.truthBoundary ?? {};
  if (boundary.automaticClassification !== false) throw new Error('automatic classification must remain false');
  if (boundary.productionWriteAuthorizedByConfig !== false) throw new Error('config must not authorize Production writes');
  if (boundary.migrationHistoryRepairAllowed !== false) throw new Error('migration history repair must remain forbidden');
  if (boundary.unrestrictedDbPushAllowed !== false) throw new Error('unrestricted db push must remain forbidden');
  if (boundary.onlyListedForwardMigrationsMayBeRehearsedOrRequested !== true) {
    throw new Error('only listed forward migrations may be rehearsed or requested');
  }

  return Object.freeze({
    schema: parsed.schema,
    changeSet: parsed.changeSet,
    count: filenames.length,
    filenames: Object.freeze(filenames),
  });
}

export function validatePromotionManifestAgainstContract(manifest, contract = loadForwardManifestContract()) {
  const failures = [];
  if (manifest?.schema !== 'risck-comply.supabase-forward-reconciliation-manifest.v1') failures.push('promotion manifest schema mismatch');
  if (manifest?.changeSet !== contract.changeSet) failures.push('promotion manifest changeSet mismatch');
  const migrations = Array.isArray(manifest?.migrations) ? manifest.migrations : [];
  if (migrations.length !== contract.count) failures.push('promotion manifest migration count mismatch');
  const names = migrations.map((item) => String(item?.filename ?? ''));
  if (JSON.stringify(names) !== JSON.stringify(contract.filenames)) failures.push('promotion manifest ordered migration identities mismatch');
  if (!/^sha256:[a-f0-9]{64}$/.test(String(manifest?.selectionDigest ?? ''))) failures.push('promotion manifest selectionDigest invalid');
  if (migrations.some((item) => !/^[a-f0-9]{64}$/.test(String(item?.sha256 ?? '')))) failures.push('promotion manifest migration digest invalid');
  if (manifest?.checks?.productionWriteAuthorized !== false) failures.push('promotion manifest must not claim config write authorization');
  if (manifest?.checks?.migrationHistoryRepairAuthorized !== false) failures.push('promotion manifest must forbid history repair');
  if (manifest?.checks?.unrestrictedDbPushAuthorized !== false) failures.push('promotion manifest must forbid unrestricted db push');
  return { valid: failures.length === 0, failures };
}
