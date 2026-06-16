import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function requireFile(path, reason) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing: ${reason}`);
    return false;
  }
  return true;
}

function requireContent(path, tokens) {
  if (!requireFile(path, 'required for P0 enterprise readiness')) return;
  const source = read(path);
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${path} missing required P0 evidence token: ${token}`);
    }
  }
}

requireFile('package-lock.json', 'deterministic npm dependency resolution is required');

requireContent('docs/security/CI_CD_BRANCH_PROTECTION.md', [
  'Required status checks',
  'Code Owner',
  'production',
  'Full Security Suite',
]);

requireContent('docs/RELEASE_EVIDENCE_CHECKLIST.md', [
  'Lockfile exists for the release candidate',
  'Live RLS validation completed against the target Supabase project',
  'External security review or pentest completed',
  'Production environment evidence',
]);

requireContent('.github/workflows/full-security-suite.yml', [
  'check-lockfile-required.mjs',
  'list-floating-dependencies.mjs',
  'check-env-example-policy.mjs',
  'check-release-environment-evidence.mjs',
]);

requireContent('.github/workflows/semgrep.yml', ['Semgrep', 'p/owasp-top-ten']);
requireContent('.github/workflows/gitleaks.yml', ['gitleaks/gitleaks-action@v2']);
requireContent('.github/workflows/actionlint.yml', ['raven-actions/actionlint@v2']);
requireContent('.github/workflows/scorecard.yml', ['ossf/scorecard-action@v2.4.2']);
requireContent('.github/workflows/codeql.yml', ['github/codeql-action']);
requireContent('.github/workflows/dependency-review.yml', ['actions/dependency-review-action']);

console.log('EuroComply P0 enterprise blocker check');
console.log('---------------------------------------');

if (failures.length > 0) {
  console.error('P0 enterprise blockers remain:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('P0 enterprise blockers: ok');
}
