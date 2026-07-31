#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  approvalDigestFor,
  DECISIONS_SCHEMA,
  decisionDigestFor,
  sha256,
  validateInventory,
} from './validate-migration-reconciliation-decisions.mjs';

const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/i;

export function sealDecisionDocument({ inventory, inventoryBytes, decisionsDocument, expectedReleaseSha }) {
  const inventoryFailures = validateInventory(inventory);
  if (inventoryFailures.length > 0) {
    throw new Error(`invalid inventory: ${inventoryFailures.join('; ')}`);
  }
  if (decisionsDocument?.schema !== DECISIONS_SCHEMA) {
    throw new Error('unsupported decisions schema');
  }

  const releaseSha = String(decisionsDocument.releaseSha ?? '').toLowerCase();
  if (!FULL_SHA_PATTERN.test(releaseSha)) throw new Error('release SHA is invalid');
  if (expectedReleaseSha && releaseSha !== String(expectedReleaseSha).toLowerCase()) {
    throw new Error('release SHA does not match the expected SHA');
  }

  const inventorySha256 = sha256(inventoryBytes);
  if (String(decisionsDocument.inventorySha256 ?? '').replace(/^sha256:/i, '').toLowerCase() !== inventorySha256) {
    throw new Error('inventory digest does not match the supplied inventory');
  }
  if (!Array.isArray(decisionsDocument.decisions)) throw new Error('decisions array is required');
  if (!decisionsDocument.independentApprover || typeof decisionsDocument.independentApprover !== 'object') {
    throw new Error('independent approver is required before sealing');
  }

  const sealed = structuredClone(decisionsDocument);
  for (const decision of sealed.decisions) {
    decision.decisionDigest = decisionDigestFor({
      releaseSha,
      inventorySha256,
      decision,
    });
  }
  sealed.approvalDigest = approvalDigestFor({
    releaseSha,
    inventorySha256,
    decisions: sealed.decisions,
    independentApprover: sealed.independentApprover,
  });
  sealed.sealedAt = new Date().toISOString();
  sealed.sealingNotice = 'Sealing calculates deterministic digests only. It does not review, classify, approve, or authorize any migration action.';
  return sealed;
}

async function runCli() {
  const args = process.argv.slice(2);
  const positional = args.filter((argument) => !argument.startsWith('--'));
  const inventoryPath = positional[0]
    ?? 'artifacts/supabase-production-migration-dry-run/drift/migration-reconciliation-inventory.json';
  const decisionsPath = positional[1]
    ?? 'artifacts/supabase-migration-reconciliation-decisions/reviewed-draft.json';
  const outputPath = positional[2]
    ?? 'artifacts/supabase-migration-reconciliation-decisions/sealed-decisions.json';
  const expectedShaArgument = args.find((argument) => argument.startsWith('--expected-sha='));
  const expectedReleaseSha = expectedShaArgument?.split('=')[1]
    ?? process.env.TARGET_SHA
    ?? process.env.GITHUB_SHA;

  try {
    const inventoryBytes = await readFile(inventoryPath);
    const inventory = JSON.parse(inventoryBytes.toString('utf8'));
    const decisionsDocument = JSON.parse(await readFile(decisionsPath, 'utf8'));
    const sealed = sealDecisionDocument({
      inventory,
      inventoryBytes,
      decisionsDocument,
      expectedReleaseSha,
    });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(sealed, null, 2)}\n`);
    console.log(JSON.stringify({
      outputPath,
      releaseSha: sealed.releaseSha,
      inventorySha256: sealed.inventorySha256,
      decisionCount: sealed.decisions.length,
      status: sealed.status,
      productionWriteAuthorized: false,
    }, null, 2));
  } catch (error) {
    console.error(`Migration reconciliation decision sealing failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
