#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import {
  auditLegalTruth,
  writeReport,
} from './legal-truth-audit.mjs';

const LEGAL_CREDIT_STATUSES = new Set([
  'PASS',
  'PASSED',
  'SUCCESS',
  'ACCEPTED',
  'ACCEPTED_WITH_CHANGES',
  'COUNSEL_ACCEPTED',
  'APPROVED',
  'COMPLETE',
  'COMPLETED',
]);

function normaliseStatus(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function normaliseTruthReport(report) {
  const falseLegalCredit = (
    report.inconsistencies?.articleRowsGrantingCreditWithoutRequiredHumanReview ?? []
  ).filter((entry) => LEGAL_CREDIT_STATUSES.has(normaliseStatus(entry.status)));

  const falseCreditBlockers = new Set(
    falseLegalCredit.map((entry) => `article_matrix:${entry.article}:${entry.status}`),
  );

  const existingControlled = report.blockers?.controlled ?? [];
  const nonArticleControlled = existingControlled.filter(
    (item) => !String(item).startsWith('article_matrix:'),
  );

  return {
    ...report,
    inconsistencies: {
      ...report.inconsistencies,
      articleRowsGrantingCreditWithoutRequiredHumanReview: falseLegalCredit,
    },
    blockers: {
      ...report.blockers,
      controlled: [
        ...nonArticleControlled,
        ...falseCreditBlockers,
      ].sort(),
    },
  };
}

export function runLegalTruthAudit({
  root = process.cwd(),
  write = false,
  strict = false,
} = {}) {
  const report = normaliseTruthReport(auditLegalTruth({ root }));
  if (write) writeReport(report, root);

  const strictFailures = [
    ...(report.inconsistencies?.articleRowsGrantingCreditWithoutRequiredHumanReview ?? []),
    ...(report.inconsistencies?.closureRequirementsWithoutQualifiedReviewDefinition ?? []),
  ];

  return {
    report,
    exitCode: strict && strictFailures.length > 0 ? 1 : 0,
  };
}

function main() {
  const result = runLegalTruthAudit({
    write: process.argv.includes('--write'),
    strict: process.argv.includes('--strict'),
  });
  process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
  process.exitCode = result.exitCode;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
