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

if (decisions.schema !== 'risck-comply.supabase-migration-reconciliation-decisions.v1') errors.push('invalid decisions schema');
if (!Array.isArray(decisions.items)) errors.push('decisions.items must be an array');
if (!decisions.targetSha || !/^[a-f0-9]{40}$/.test(decisions.targetSha)) errors.push('targetSha must be a full commit SHA');
if (!decisions.reviewedBy || !decisions.approvedBy || decisions.reviewedBy === decisions.approvedBy) errors.push('reviewer and approver must be distinct');
if (!decisions.reviewedAt || !decisions.approvedAt) errors.push('review timestamps are required');

const sourceByKey = new Map(inventory.items.map((item) => [`${item.version ?? 'invalid'}:${item.filename}`, item]));
const seen = new Set();
const accepted = [];
for (const item of decisions.items ?? []) {
  const key = `${item.version ?? 'invalid'}:${item.filename}`;
  const source = sourceByKey.get(key);
  if (!source) { errors.push(`decision not present in inventory: ${key}`); continue; }
  if (seen.has(key)) { errors.push(`duplicate decision: ${key}`); continue; }
  seen.add(key);
  if (item.sha256 !== source.sha256) errors.push(`digest mismatch: ${key}`);
  if (!allowed.has(item.classification)) errors.push(`invalid classification: ${key}`);
  if (!item.rationale || item.rationale.length < 20) errors.push(`insufficient rationale: ${key}`);
  if (!item.schemaEvidenceReference) errors.push(`missing schema evidence: ${key}`);
  if (!item.reviewer || !item.reviewedAt) errors.push(`missing item review attribution: ${key}`);
  if (item.classification === 'PENDING_DEPLOYMENT' && (!item.stagingRunReference || !item.rollbackReference || !Number.isInteger(item.deployOrder))) errors.push(`pending deployment lacks staged execution plan: ${key}`);
  if (item.classification === 'SUPERSEDED' && !item.replacementDigest) errors.push(`superseded item lacks replacement digest: ${key}`);
  if (item.classification === 'ALREADY_PRESENT_IN_SCHEMA' && !item.objectProofDigest) errors.push(`already-present item lacks object proof digest: ${key}`);
  accepted.push({ ...item, sourceReasons: source.classificationReasons });
}

for (const key of sourceByKey.keys()) if (!seen.has(key)) errors.push(`unclassified inventory item: ${key}`);
const pending = accepted.filter((item) => item.classification === 'PENDING_DEPLOYMENT').sort((a,b) => a.deployOrder - b.deployOrder);
const duplicateOrders = pending.filter((item, index) => index > 0 && item.deployOrder === pending[index - 1].deployOrder).map((item) => item.deployOrder);
if (duplicateOrders.length) errors.push(`duplicate deployOrder values: ${[...new Set(duplicateOrders)].join(', ')}`);

const status = errors.length === 0 ? 'READY_FOR_STAGING_REHEARSAL' : 'BLOCKED';
const result = {
  schema: 'risck-comply.supabase-migration-reconciliation-result.v1',
  generatedAt,
  status,
  targetSha: decisions.targetSha ?? null,
  inventoryDigest: sha256(inventoryRaw),
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
