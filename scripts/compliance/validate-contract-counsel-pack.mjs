#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MANIFEST_PATH = 'docs/legal-review-preparation/legal-pack/manifest.json';
const MARKDOWN_ACCEPTED_STATUS = /\*\*Status:\*\*\s*`?(?:ACCEPTED|COUNSEL_ACCEPTED)`?/;

function readText(root, path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(root, path) {
  return JSON.parse(readText(root, path));
}

function countNulls(value) {
  if (value === null) return 1;
  if (Array.isArray(value)) return value.reduce((total, item) => total + countNulls(item), 0);
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((total, item) => total + countNulls(item), 0);
  }
  return 0;
}

function documentClaimsAcceptance(root, path) {
  if (path.endsWith('.json')) {
    const document = readJson(root, path);
    return document.status === 'ACCEPTED' || document.status === 'COUNSEL_ACCEPTED';
  }
  return MARKDOWN_ACCEPTED_STATUS.test(readText(root, path));
}

export function validateContractCounselPack({ root = process.cwd() } = {}) {
  const failures = [];
  if (!existsSync(join(root, MANIFEST_PATH))) {
    return {
      schema: 'risck-comply.contract-counsel-pack-readiness.v1',
      status: 'PACKAGE_PREPARATION_FAILED',
      failures: ['manifest_missing'],
      counselAccepted: false,
    };
  }

  const manifest = readJson(root, MANIFEST_PATH);
  if (manifest.schema !== 'risck-comply.contract-counsel-pack.v1') failures.push('manifest_schema_invalid');
  if (manifest.status !== 'HUMAN_REVIEW_REQUIRED') failures.push('manifest_status_must_require_human_review');
  if (!Array.isArray(manifest.documents) || manifest.documents.length !== 9) failures.push('manifest_must_list_nine_documents');

  const documents = [];
  for (const entry of manifest.documents ?? []) {
    const absolutePath = join(root, entry.path ?? '');
    if (!entry.id || !entry.path) {
      failures.push('manifest_document_invalid');
      continue;
    }
    if (!existsSync(absolutePath)) {
      failures.push(`${entry.id}.missing`);
      continue;
    }
    if (documentClaimsAcceptance(root, entry.path)) failures.push(`${entry.id}.contains_unverified_accepted_status`);
    if (entry.status === 'ACCEPTED' || entry.status === 'COUNSEL_ACCEPTED') failures.push(`${entry.id}.manifest_grants_false_credit`);
    documents.push({ id: entry.id, path: entry.path, status: entry.status, prepared: true });
  }

  for (const path of [manifest.founderFactsPath, manifest.founderQuestionnairePath, manifest.acceptanceGate]) {
    if (!path || !existsSync(join(root, path))) failures.push(`required_dependency_missing:${path ?? 'undefined'}`);
  }

  const founderFacts = readJson(root, manifest.founderFactsPath);
  if (founderFacts.status !== 'FOUNDER_FACT_REQUIRED') failures.push('founder_facts_template_status_invalid');
  const founderFactsUnresolvedCount = countNulls(founderFacts);
  if (founderFactsUnresolvedCount === 0) failures.push('founder_facts_template_should_not_claim_completion');

  const claims = readJson(root, 'docs/legal-review-preparation/legal-pack/CLAIMS_REGISTER.json');
  const claimClassifications = new Set((claims.rules ?? []).map((rule) => rule.classification));
  if (!claimClassifications.has('PROHIBITED')) failures.push('claims_register_missing_prohibited_class');
  if (!claimClassifications.has('CONDITIONALLY_PROHIBITED')) failures.push('claims_register_missing_conditional_class');
  if (claims.status !== 'COUNSEL_REVIEW_REQUIRED') failures.push('claims_register_status_invalid');

  const decisionSheet = readJson(root, 'docs/legal-review-preparation/legal-pack/FINAL_DECISION_SHEET_TEMPLATE.json');
  if (decisionSheet.status !== 'HUMAN_REVIEW_REQUIRED') failures.push('decision_sheet_must_require_human_review');
  if ((decisionSheet.workstreamDecisions ?? []).length !== 8) failures.push('decision_sheet_must_cover_eight_workstreams');
  if ((decisionSheet.workstreamDecisions ?? []).some((item) => item.decision !== 'HUMAN_REVIEW_REQUIRED')) {
    failures.push('decision_sheet_grants_false_credit');
  }

  return {
    schema: 'risck-comply.contract-counsel-pack-readiness.v1',
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'READY_FOR_FOUNDER_AND_COUNSEL_HANDOFF' : 'PACKAGE_PREPARATION_FAILED',
    preparedDocumentCount: documents.length,
    expectedDocumentCount: 9,
    founderFactsUnresolvedCount,
    founderFactsComplete: false,
    counselAccepted: false,
    legalAcceptanceStatus: 'HUMAN_REVIEW_REQUIRED',
    failures: [...new Set(failures)].sort(),
    documents,
    notice: 'Repository preparation can be complete while founder facts and legal acceptance remain incomplete.',
  };
}

function main() {
  const report = validateContractCounselPack();
  if (process.argv.includes('--write')) {
    const path = 'artifacts/legal-review/contract-counsel-pack-readiness.json';
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes('--strict') && report.failures.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
