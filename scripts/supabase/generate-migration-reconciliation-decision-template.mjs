#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  DECISIONS_SCHEMA,
  sha256,
  validateInventory,
} from './validate-migration-reconciliation-decisions.mjs';

const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/i;

export function buildDecisionTemplate({ inventory, inventoryBytes, releaseSha }) {
  const failures = validateInventory(inventory);
  if (failures.length > 0) {
    throw new Error(`invalid inventory: ${failures.join('; ')}`);
  }
  if (!FULL_SHA_PATTERN.test(String(releaseSha ?? ''))) {
    throw new Error('release SHA must be a full 40-character Git SHA');
  }

  return {
    schema: DECISIONS_SCHEMA,
    status: 'HUMAN_REVIEW_REQUIRED',
    releaseSha: String(releaseSha).toLowerCase(),
    inventorySha256: sha256(inventoryBytes),
    generatedAt: new Date().toISOString(),
    independentApprover: null,
    approvalDigest: null,
    decisions: inventory.items.map((item) => ({
      filename: item.filename,
      sha256: item.sha256,
      version: item.version,
      classificationReasons: item.classificationReasons,
      classification: null,
      allowedClassifications: inventory.allowedClassifications,
      rationale: null,
      schemaEvidenceReference: null,
      replacementMigrationDigest: null,
      stagedExecutionEvidenceReference: null,
      deployOrderDecision: null,
      rollbackReference: null,
      archivalMappingReference: null,
      splitReviewReference: null,
      reviewer: null,
      reviewerRole: null,
      reviewedAt: null,
      decisionDigest: null,
    })),
    nonCreditingNotice: 'This template contains no accepted migration classifications, migration-history repairs, dry-run authorization, or production authorization.',
  };
}

async function runCli() {
  const args = process.argv.slice(2);
  const positional = args.filter((argument) => !argument.startsWith('--'));
  const inventoryPath = positional[0]
    ?? 'artifacts/supabase-production-migration-dry-run/drift/migration-reconciliation-inventory.json';
  const outputPath = positional[1]
    ?? 'artifacts/supabase-migration-reconciliation-decisions/template.json';
  const releaseShaArgument = args.find((argument) => argument.startsWith('--release-sha='));
  const releaseSha = releaseShaArgument?.split('=')[1]
    ?? process.env.TARGET_SHA
    ?? process.env.GITHUB_SHA;

  try {
    const inventoryBytes = await readFile(inventoryPath);
    const inventory = JSON.parse(inventoryBytes.toString('utf8'));
    const template = buildDecisionTemplate({ inventory, inventoryBytes, releaseSha });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`);
    console.log(JSON.stringify({
      outputPath,
      releaseSha: template.releaseSha,
      inventorySha256: template.inventorySha256,
      itemCount: template.decisions.length,
      status: template.status,
    }, null, 2));
  } catch (error) {
    console.error(`Migration reconciliation decision template generation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
