#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function buildDossiers({ inventory, inventoryBytes, evidence, evidenceBytes, releaseSha }) {
  if (inventory?.schema !== 'risck-comply.supabase-migration-reconciliation-inventory.v1') throw new Error('unsupported inventory schema');
  if (evidence?.schema !== 'risck-comply.supabase-migration-object-evidence.v1') throw new Error('unsupported evidence schema');
  if (!/^[a-f0-9]{40}$/i.test(String(releaseSha ?? ''))) throw new Error('release SHA must be a full 40-character Git SHA');
  const evidenceByFile = new Map((evidence.migrations ?? []).map((item) => [item.filename, item]));
  const dossiers = inventory.items.map((item) => {
    const observed = evidenceByFile.get(item.filename);
    if (!observed) throw new Error(`missing object evidence: ${item.filename}`);
    if (observed.sha256 !== item.sha256) throw new Error(`evidence digest mismatch: ${item.filename}`);
    const objects = observed.objects ?? [];
    const present = objects.filter((object) => object.presentInLiveCatalog === true);
    const missing = objects.filter((object) => object.presentInLiveCatalog !== true);
    return {
      filename: item.filename,
      version: item.version,
      sqlSha256: item.sha256,
      classificationReasons: item.classificationReasons,
      extractedObjectCount: objects.length,
      presentObjectCount: present.length,
      missingObjectCount: missing.length,
      allExtractedObjectsPresent: observed.allExtractedObjectsPresent === true,
      extractedObjects: objects,
      evidenceAssessment: {
        supportsAlreadyPresentReview: objects.length > 0 && missing.length === 0,
        provesMigrationApplied: false,
        unsupportedSemanticsRemain: true,
      },
      reviewerDecision: {
        classification: null,
        rationale: null,
        schemaEvidenceReference: null,
        stagedExecutionEvidenceReference: null,
        replacementMigrationDigest: null,
        archivalMappingReference: null,
        rollbackReference: null,
        reviewer: null,
        reviewerRole: null,
        reviewedAt: null,
      },
      automaticClassification: null,
      reviewRequired: true,
    };
  });
  return {
    schema: 'risck-comply.supabase-migration-review-dossiers.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    releaseSha: String(releaseSha).toLowerCase(),
    inventorySha256: sha256(inventoryBytes),
    objectEvidenceSha256: sha256(evidenceBytes),
    generatedAt: new Date().toISOString(),
    counts: {
      total: dossiers.length,
      allObjectsPresent: dossiers.filter((item) => item.allExtractedObjectsPresent).length,
      objectsMissing: dossiers.filter((item) => item.missingObjectCount > 0).length,
      noObjectsExtracted: dossiers.filter((item) => item.extractedObjectCount === 0).length,
      acceptedDecisions: 0,
    },
    dossiers,
    nonCreditingNotice: 'These dossiers organize evidence for human review only. They do not classify migrations, repair history, authorize dry-run, or authorize production writes.',
  };
}

async function main() {
  const [inventoryPath, evidencePath, outputDir = 'artifacts/supabase-migration-review-dossiers'] = process.argv.slice(2);
  const releaseSha = process.env.TARGET_SHA ?? process.env.GITHUB_SHA;
  if (!inventoryPath || !evidencePath) throw new Error('usage: inventory.json migration-object-evidence.json [output-dir]');
  const inventoryBytes = await readFile(inventoryPath);
  const evidenceBytes = await readFile(evidencePath);
  const report = buildDossiers({
    inventory: JSON.parse(inventoryBytes),
    inventoryBytes,
    evidence: JSON.parse(evidenceBytes),
    evidenceBytes,
    releaseSha,
  });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'migration-review-dossiers.json'), `${JSON.stringify(report, null, 2)}\n`);
  for (const dossier of report.dossiers) {
    const lines = [
      `# Migration review dossier — ${dossier.filename}`,
      '',
      `- Version: \`${dossier.version ?? 'invalid'}\``,
      `- SQL SHA-256: \`${dossier.sqlSha256}\``,
      `- Extracted objects: ${dossier.extractedObjectCount}`,
      `- Present: ${dossier.presentObjectCount}`,
      `- Missing: ${dossier.missingObjectCount}`,
      `- All extracted objects present: \`${dossier.allExtractedObjectsPresent}\``,
      '',
      '## Evidence boundary',
      '',
      'Object-name presence does not prove columns, constraints, policy expressions, grants, function bodies, triggers, or data migrations are equivalent.',
      '',
      '## Objects',
      '',
      ...(dossier.extractedObjects.length ? dossier.extractedObjects.map((object) => `- ${object.kind} \`${object.name}\` — present: \`${object.presentInLiveCatalog === true}\``) : ['- No supported objects extracted; direct SQL review required.']),
      '',
      '## Human decision',
      '',
      '- Classification:',
      '- Rationale:',
      '- Evidence references:',
      '- Reviewer:',
      '- Reviewed at:',
      '',
    ];
    await writeFile(path.join(outputDir, `${dossier.filename}.md`), lines.join('\n'));
  }
  console.log(JSON.stringify(report.counts, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exit(1); });
