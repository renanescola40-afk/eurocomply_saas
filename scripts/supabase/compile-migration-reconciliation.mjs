#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [inventoryPath = 'artifacts/supabase-migration-drift/migration-reconciliation-inventory.json', decisionsPath = 'docs/security/evidence/templates/supabase-migration-reconciliation-decisions.json', outputDir = 'artifacts/supabase-migration-reconciliation'] = process.argv.slice(2);
const generatedAt = new Date().toISOString();
const allowed = new Set(['ALREADY_PRESENT_IN_SCHEMA','PENDING_DEPLOYMENT','SUPERSEDED','ARCHIVE_LEGACY','REQUIRES_SPLIT_REVIEW']);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const inventoryRaw = await readFile(inventoryPath, 'utf8');
const decisionsRaw = await readFile(decisionsPath, 'utf8');
const inventory = JSON.parse(inventoryRaw);
const decisions = JSON.parse(decisionsRaw);
const errors = [];
const isDigest = (value) => /^(?:sha256:)?[a-f0-9]{64}$/i.test(String(value ?? ''));
const normalizedDigest = (value) => String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
const isMeaningful = (value) => typeof value === 'string' && value.trim().length > 0 && !/^(?:REPLACE_WITH|TBD|TODO|UNKNOWN)/i.test(value.trim());
const expectedSha = String(process.env.TARGET_SHA ?? '').toLowerCase().trim();
const actualInventoryDigest = sha256(inventoryRaw);

if (inventory?.schema !== 'risck-comply.supabase-migration-reconciliation-inventory.v1') errors.push('invalid inventory schema');
if (!Array.isArray(inventory?.items) || inventory.items.length === 0) errors.push('inventory.items must be non-empty');
if (!Array.isArray(inventory?.remoteVersions) || inventory.remoteVersions.length === 0) errors.push('remote migration ledger versions missing');
if (!/^[a-f0-9]{40}$/.test(expectedSha)) errors.push('TARGET_SHA must be exact 40-character release SHA');
if (String(decisions?.targetSha ?? '').toLowerCase() !== expectedSha) errors.push('target SHA mismatch');
if (!isDigest(decisions?.inventorySha256) || normalizedDigest(decisions.inventorySha256) !== actualInventoryDigest) errors.push('inventory digest mismatch');
if (!isDigest(decisions?.productionSchemaDumpDigest)) errors.push('production schema dump digest missing');
if (!isDigest(decisions?.remoteMigrationListDigest)) errors.push('remote migration ledger digest missing');
if (!isMeaningful(decisions?.productionProjectRef)) errors.push('production project ref missing');

if (decisions.schema !== 'risck-comply.supabase-migration-reconciliation-decisions.v1') errors.push('invalid decisions schema');
if (!Array.isArray(decisions.items)) errors.push('decisions.items must be an array');
if (!decisions.targetSha || !/^[a-f0-9]{40}$/.test(decisions.targetSha)) errors.push('targetSha must be a full commit SHA');
if (!isMeaningful(decisions.reviewedBy) || !isMeaningful(decisions.approvedBy) || decisions.reviewedBy.trim().toLowerCase() === decisions.approvedBy.trim().toLowerCase()) errors.push('reviewer and approver must be distinct');
if (!Number.isFinite(Date.parse(decisions.reviewedAt)) || !Number.isFinite(Date.parse(decisions.approvedAt))) errors.push('review timestamps are required');
if (Date.parse(decisions.reviewedAt) > Date.now() || Date.parse(decisions.approvedAt) > Date.now()) errors.push('review timestamps must not be future');

const sourceItems = Array.isArray(inventory?.items) ? inventory.items : [];
const sourceByKey = new Map(sourceItems.map((item) => [`${item.version ?? 'invalid'}:${item.filename}`, item]));
if (sourceByKey.size !== sourceItems.length) errors.push('duplicate inventory item');
if (sourceItems.some((item) => !isDigest(item.sha256))) errors.push('invalid inventory file digest');
const seen = new Set();
const accepted = [];
for (const item of decisions.items ?? []) {
  const key = `${item.version ?? 'invalid'}:${item.filename}`;
  const source = sourceByKey.get(key);
  if (!source) { errors.push(`decision not present in inventory: ${key}`); continue; }
  if (seen.has(key)) { errors.push(`duplicate decision: ${key}`); continue; }
  seen.add(key);
  if (!isDigest(item.sha256) || !isDigest(source.sha256) || normalizedDigest(item.sha256) !== normalizedDigest(source.sha256)) errors.push(`digest mismatch: ${key}`);
  if (!allowed.has(item.classification)) errors.push(`invalid classification: ${key}`);
  if (!item.rationale || item.rationale.length < 20) errors.push(`insufficient rationale: ${key}`);
  if (!isMeaningful(item.schemaEvidenceReference)) errors.push(`missing schema evidence: ${key}`);
  if (!isMeaningful(item.reviewer) || !Number.isFinite(Date.parse(item.reviewedAt))) errors.push(`missing item review attribution: ${key}`);
  if (item.classification === 'PENDING_DEPLOYMENT' && (!isMeaningful(item.stagingRunReference) || !isMeaningful(item.rollbackReference) || !Number.isInteger(item.deployOrder) || item.deployOrder < 1)) errors.push(`pending deployment lacks staged execution plan: ${key}`);
  if (item.classification === 'SUPERSEDED' && !isDigest(item.replacementDigest)) errors.push(`superseded item lacks replacement digest: ${key}`);
  if (item.classification === 'ALREADY_PRESENT_IN_SCHEMA' && !isDigest(item.objectProofDigest)) errors.push(`already-present item lacks object proof digest: ${key}`);
  if (item.classification === 'REQUIRES_SPLIT_REVIEW') errors.push(`split review unresolved: ${key}`);
  accepted.push({ ...item, sourceReasons: source.classificationReasons });
}

for (const key of sourceByKey.keys()) if (!seen.has(key)) errors.push(`unclassified inventory item: ${key}`);
if (accepted.length !== sourceByKey.size) errors.push('decision count differs from source inventory');
const pending = accepted.filter((item) => item.classification === 'PENDING_DEPLOYMENT').sort((a,b) => a.deployOrder - b.deployOrder);
const duplicateOrders = pending.filter((item, index) => index > 0 && item.deployOrder === pending[index - 1].deployOrder).map((item) => item.deployOrder);
if (duplicateOrders.length) errors.push(`duplicate deployOrder values: ${[...new Set(duplicateOrders)].join(', ')}`);

const status = errors.length === 0 ? 'READY_FOR_STAGING_REHEARSAL' : 'BLOCKED';
const result = {
  schema: 'risck-comply.supabase-migration-reconciliation-result.v1',
  generatedAt,
  status,
  targetSha: decisions.targetSha ?? null,
  inventoryDigest: actualInventoryDigest,
  decisionsDigest: sha256(decisionsRaw),
  counts: {
    inventoryItems: sourceByKey.size,
    decisions: accepted.length,
    pendingDeployment: pending.length,
    alreadyPresent: accepted.filter((i) => i.classification === 'ALREADY_PRESENT_IN_SCHEMA').length,
    superseded: accepted.filter((i) => i.classification === 'SUPERSEDED').length,
    archiveLegacy: accepted.filter((i) => i.classification === 'ARCHIVE_LEGACY').length,
    splitReview: accepted.filter((i) => i.classification === 'REQUIRES_SPLIT_REVIEW').length,
  },
  errors,
  pendingDeploymentPlan: pending,
  historyRepairCandidates: accepted.filter((i) => i.classification === 'ALREADY_PRESENT_IN_SCHEMA'),
  nonDeployableItems: accepted.filter((i) => ['SUPERSEDED','ARCHIVE_LEGACY','REQUIRES_SPLIT_REVIEW'].includes(i.classification)),
  safety: {
    databaseModified: false,
    migrationHistoryModified: false,
    productionPushAuthorized: false,
    unrestrictedDbPushAllowed: false,
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'migration-reconciliation-result.json'), JSON.stringify(result, null, 2) + '\n');
let md = `# Supabase migration reconciliation\n\nStatus: **${status}**\n\nTarget SHA: \`${result.targetSha ?? 'missing'}\`\n\n`;
md += `- Inventory items: ${result.counts.inventoryItems}\n- Reviewed decisions: ${result.counts.decisions}\n- Pending deployment: ${result.counts.pendingDeployment}\n- History repair candidates: ${result.counts.alreadyPresent}\n\n`;
md += errors.length ? `## Blockers\n\n${errors.map((e) => `- ${e}`).join('\n')}\n` : '## Next step\n\nRun the protected staging rehearsal. This artifact does not authorize production changes.\n';
await writeFile(path.join(outputDir, 'migration-reconciliation-result.md'), md);
process.stdout.write(md);
if (errors.length) process.exitCode = 2;
