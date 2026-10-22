import { readFileSync } from 'node:fs';

// This gate only proves the named Playwright test executed successfully.
// It does not establish provider persistence, Stripe events, payment, or customer acceptance.
export function verifyPaidOwnerPlaywrightProof(report) {
  if (!report || typeof report !== 'object' || !Array.isArray(report.suites)) {
    throw new Error('qa_playwright_report_missing_or_invalid');
  }
  const matches = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      if ((spec.file ?? '').replaceAll('\\', '/').endsWith('tests/e2e/retention-export-functional.spec.ts') &&
          spec.title === 'owner clicks export, receives MFA dialog, and unverified API request is denied') {
        for (const t of spec.tests ?? []) matches.push(t);
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites) visit(suite);
  if (matches.length !== 1) throw new Error('qa_paid_owner_proof_not_executed_exactly_once');
  const [t] = matches;
  if (t.status !== 'expected' || !Array.isArray(t.results) || t.results.length !== 1 ||
      t.results[0]?.status !== 'passed') {
    throw new Error('qa_paid_owner_proof_failed_skipped_or_flaky');
  }
  const stats = report.stats;
  // A passing target is insufficient if the same run skipped other tests,
  // or if the aggregate Playwright result counts are absent or malformed.
  if (!stats || !Number.isInteger(stats.expected) || stats.expected < 1 ||
      !Number.isInteger(stats.skipped) || stats.skipped !== 0 ||
      !Number.isInteger(stats.unexpected) || stats.unexpected !== 0 ||
      !Number.isInteger(stats.flaky) || stats.flaky !== 0) {
    throw new Error('qa_playwright_suite_has_unexpected_flaky_or_skipped_tests');
  }
  return Object.freeze({
    result: 'PAID_OWNER_MFA_NEGATIVE_BOUNDARY_BROWSER_EXECUTED',
    providerPersistenceVerified: false,
    subscriptionLifecycleVerified: false,
    legalAcceptanceVerified: false,
  });
}

if (process.argv[1]?.endsWith('/check-paid-owner-playwright-proof.mjs')) {
  try {
    const path = process.argv[2];
    if (!path) throw new Error('qa_playwright_report_path_required');
    const report = JSON.parse(readFileSync(path, 'utf8'));
    console.log(JSON.stringify(verifyPaidOwnerPlaywrightProof(report)));
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'qa_playwright_proof_invalid');
    process.exitCode = 1;
  }
}
