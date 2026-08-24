#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
import {
  loadForwardManifestContract,
  validatePromotionManifestAgainstContract,
} from './supabase-forward-manifest-contract.mjs';

function fail(message) {
  throw new Error(`promotion_source_invalid:${message}`);
}
function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${label}:${error instanceof Error ? error.message : String(error)}`);
  }
}

const targetSha = String(process.env.TARGET_SHA ?? '').trim().toLowerCase();
const promotionRunId = String(process.env.PROMOTION_RUN_ID ?? '').trim();
const transitionPath = String(process.env.PROMOTION_TRANSITION_PATH ?? '').trim();
const postconditionsPath = String(process.env.LIVE_POSTCONDITIONS_PATH ?? '').trim();
const manifestPath = String(process.env.PROMOTION_MANIFEST_PATH ?? '').trim();
const githubEnvPath = String(process.env.GITHUB_ENV ?? '').trim();

if (!/^[a-f0-9]{40}$/.test(targetSha)) fail('TARGET_SHA');
if (!/^\d+$/.test(promotionRunId)) fail('PROMOTION_RUN_ID');
if (!transitionPath || !postconditionsPath || !manifestPath) fail('source_paths');

const contract = loadForwardManifestContract();
const transition = readJson(transitionPath, 'promotion_transition');
const postconditions = readJson(postconditionsPath, 'live_postconditions');
const manifest = readJson(manifestPath, 'promotion_manifest');

if (transition?.schema !== 'risck-comply.supabase-forward-reconciliation-promotion.v1') fail('transition_schema');
if (transition?.status !== 'Complete' || transition?.outcome !== 'passed') fail('transition_status');
if (String(transition?.targetSha ?? '').toLowerCase() !== targetSha) fail('transition_sha');
if (Number(transition?.selectedMigrationCount) !== contract.count) fail('transition_count');
if (transition?.checks?.remoteAfterEqualsBeforePlusSelected !== true) fail('remote_transition');
if (transition?.checks?.unauthorizedMigrationApplied !== false) fail('unauthorized_migration');
if (transition?.checks?.migrationHistoryRepairPerformed !== false) fail('history_repair');
if (transition?.checks?.unrestrictedDbPushPerformed !== false) fail('unrestricted_push');

if (postconditions?.status !== 'PASS') fail('postconditions_status');
if (postconditions?.readOnly !== true) fail('postconditions_read_only');
if (postconditions?.postconditions !== 'forward_reconciliation_postconditions_passed') fail('postconditions_marker');

if (String(manifest?.targetSha ?? '').toLowerCase() !== targetSha) fail('manifest_sha');
const manifestValidation = validatePromotionManifestAgainstContract(manifest, contract);
if (!manifestValidation.valid) fail(manifestValidation.failures.join(','));

const lines = [
  `PROMOTION_CHANGE_SET=${contract.changeSet}`,
  `PROMOTION_SELECTED_MIGRATION_COUNT=${contract.count}`,
  `PROMOTION_SELECTION_DIGEST=${manifest.selectionDigest}`,
  'PROMOTION_MANIFEST_MATCH_VERIFIED=true',
  'PROMOTION_REMOTE_TRANSITION_VERIFIED=true',
  'PROMOTION_UNAUTHORIZED_MIGRATION_APPLIED=false',
  'PROMOTION_PRODUCTION_VERIFIED=true',
];

if (githubEnvPath) appendFileSync(githubEnvPath, `${lines.join('\n')}\n`);
process.stdout.write(`${JSON.stringify({
  status: 'PASS',
  targetSha,
  promotionRunId,
  changeSet: contract.changeSet,
  selectedMigrationCount: contract.count,
  selectionDigest: manifest.selectionDigest,
  orderedManifestMatch: true,
}, null, 2)}\n`);
