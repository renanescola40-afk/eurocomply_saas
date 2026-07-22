#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { validateEvidenceDocument, sha256 } from './validate-enterprise-evidence-closure.mjs';

const [,, requirementId, stagedFile] = process.argv;
if (!requirementId || !stagedFile) {
  console.error('Usage: node scripts/compliance/prepare-enterprise-evidence-promotion.mjs <requirement-id> <staged-json>');
  process.exit(2);
}

const registry = JSON.parse(fs.readFileSync(path.join('docs', 'compliance', 'evidence', 'enterprise-evidence-closure-registry.json'), 'utf8'));
const requirement = registry.requirements.find((item) => item.id === requirementId);
if (!requirement) {
  console.error(`Unknown requirement: ${requirementId}`);
  process.exit(2);
}

const raw = fs.readFileSync(stagedFile, 'utf8');
const document = JSON.parse(raw);
const expectedSha = process.env.EVIDENCE_EXACT_SHA || process.env.GITHUB_SHA;
const failures = validateEvidenceDocument(document, requirement, registry.policy, { expectedSha, raw });
if (failures.length > 0) {
  console.error(JSON.stringify({ requirementId, failures }, null, 2));
  process.exit(1);
}

const bundle = {
  schema: 'risck-comply.enterprise-evidence-promotion-bundle.v1',
  requirement,
  sourceFile: stagedFile,
  targetPath: requirement.path,
  exactSha: document.exactSha,
  sourceDigest: sha256(raw),
  preparedAt: new Date().toISOString(),
  mutationPerformed: false,
  nextAction: 'Review this bundle, then copy the staged document to targetPath in a dedicated evidence PR.',
};

const outputDir = path.join('artifacts', 'enterprise-evidence-closure', 'promotion');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, `${requirementId}.json`), `${JSON.stringify(bundle, null, 2)}\n`);
console.log(JSON.stringify(bundle, null, 2));
