import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const npmrcPath = '.npmrc';
const supplyChainDocPath = 'docs/security/SUPPLY_CHAIN.md';
const lockfileRunbookPath = 'docs/security/LOCKFILE_TRIAGE_RUNBOOK.md';
const securityCiWorkflowPath = '.github/workflows/security-ci.yml';
const dependencyReviewWorkflowPath = '.github/workflows/dependency-review.yml';
const ciRequiredChecksEvidencePath = 'docs/security/evidence/runtime/ci-required-checks-validation.json';
const expectedPackageManager = 'npm@10.8.2';

const failures = [];
const warnings = [];

function readJson(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return null;
  }

  return JSON.parse(readFileSync(path, 'utf8'));
}

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function getCurrentNpmVersion() {
  try {
    return execSync('npm --version', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function isFloatingDependencySpec(versionSpec) {
  const normalized = String(versionSpec ?? '').trim();

  return (
    normalized === 'latest' ||
    normalized === '*' ||
    normalized.startsWith('>=') ||
    normalized.includes(' || ') ||
    /^\d+\.x(?:\.x)?$/i.test(normalized) ||
    /^x(?:\.x){0,2}$/i.test(normalized)
  );
}

function warnOnFloatingDependencySpecs(sectionName, dependencies = {}) {
  for (const [name, versionSpec] of Object.entries(dependencies)) {
    if (!isFloatingDependencySpec(versionSpec)) continue;

    warnings.push(
      `${packageJsonPath} ${sectionName}.${name} uses floating version spec "${versionSpec}"; replace it with an exact audited version during lockfile triage.`,
    );
  }
}

function warnOnNpmRuntimeDrift(packageManager) {
  const currentNpmVersion = getCurrentNpmVersion();
  if (!currentNpmVersion) {
    warnings.push('Unable to detect npm runtime version; confirm CI/local npm matches packageManager before dependency triage.');
    return;
  }

  const currentPackageManager = `npm@${currentNpmVersion}`;
  if (currentPackageManager === packageManager) return;

  warnings.push(
    `Current npm runtime is ${currentPackageManager}, but ${packageJsonPath} pins ${packageManager}; align npm before generating package-lock.json or triaging npm audit output.`,
  );
}

const pkg = readJson(packageJsonPath);
const npmrc = read(npmrcPath);
const supplyChainDoc = read(supplyChainDocPath);
const lockfileRunbook = read(lockfileRunbookPath);
const securityCi = read(securityCiWorkflowPath);
const dependencyReview = read(dependencyReviewWorkflowPath);
const ciRequiredChecksEvidence = readJson(ciRequiredChecksEvidencePath);
const hasPackageLock = existsSync('package-lock.json');

console.log('EuroComply supply-chain policy check');
console.log('------------------------------------');

if (pkg) {
  if (pkg.packageManager !== expectedPackageManager) {
    failures.push(`${packageJsonPath} must pin packageManager to ${expectedPackageManager}`);
  }

  warnOnNpmRuntimeDrift(pkg.packageManager);

  const scripts = pkg.scripts ?? {};
  for (const scriptName of ['preinstall', 'install', 'postinstall', 'prepare']) {
    if (scripts[scriptName]) {
      failures.push(`${packageJsonPath} must not define lifecycle script: ${scriptName}`);
    }
  }

  for (const scriptName of [
    'security:npm-audit:prod',
    'security:npm-audit:all',
    'security:npm-audit:json',
    'security:zod-compat',
    'security:final-readiness',
    'security:final-readiness:report',
    'supply-chain:lockfile',
    'supply-chain:floating-deps',
  ]) {
    if (!scripts[scriptName]) {
      failures.push(`${packageJsonPath} missing required supply-chain script: ${scriptName}`);
    }
  }

  if (scripts['supply-chain:lockfile'] && !scripts['supply-chain:lockfile'].includes('--package-lock-only --ignore-scripts')) {
    failures.push(`${packageJsonPath} supply-chain:lockfile must generate only the lockfile and ignore lifecycle scripts`);
  }

  if (scripts['supply-chain:floating-deps'] && !scripts['supply-chain:floating-deps'].includes('scripts/security/list-floating-dependencies.mjs')) {
    failures.push(`${packageJsonPath} supply-chain:floating-deps must use scripts/security/list-floating-dependencies.mjs`);
  }

  if (scripts['security:zod-compat'] && !scripts['security:zod-compat'].includes('scripts/security/check-zod-error-usage.mjs')) {
    failures.push(`${packageJsonPath} security:zod-compat must use scripts/security/check-zod-error-usage.mjs`);
  }

  if (scripts['security:final-readiness'] && !scripts['security:final-readiness'].includes('scripts/security/check-final-security-readiness.mjs')) {
    failures.push(`${packageJsonPath} security:final-readiness must use scripts/security/check-final-security-readiness.mjs`);
  }

  if (scripts['security:final-readiness:report'] && !scripts['security:final-readiness:report'].includes('scripts/security/write-final-readiness-report.mjs')) {
    failures.push(`${packageJsonPath} security:final-readiness:report must use scripts/security/write-final-readiness-report.mjs`);
  }

  warnOnFloatingDependencySpecs('dependencies', pkg.dependencies ?? {});
  warnOnFloatingDependencySpecs('devDependencies', pkg.devDependencies ?? {});
}

if (npmrc) {
  for (const token of ['package-lock=true', 'audit=true', 'fund=false', 'save-exact=true']) {
    if (!npmrc.includes(token)) {
      failures.push(`${npmrcPath} missing required npm policy: ${token}`);
    }
  }
}

if (supplyChainDoc) {
  for (const token of [
    'Dependency Review',
    'CodeQL',
    'npm install --package-lock-only --ignore-scripts',
    'package-lock.json',
    'npm ci --ignore-scripts',
    'floating version',
    'npm runtime drift',
    'supply-chain:lockfile',
    'supply-chain:floating-deps',
    'security:zod-compat',
    'security:final-readiness',
    'security:final-readiness:report',
    'cache enabled after lockfile exists',
    'ci-required-checks-validation',
  ]) {
    if (!supplyChainDoc.includes(token)) {
      failures.push(`${supplyChainDocPath} missing required supply-chain evidence token: ${token}`);
    }
  }
}

if (lockfileRunbook) {
  for (const token of ['Lockfile and npm Audit Triage Runbook', 'npm@10.8.2', 'npm run supply-chain:lockfile', 'npm install --package-lock-only --ignore-scripts', 'npm run security:npm-audit:json > npm-audit.json', 'npm run security:npm-audit:summary', 'npm run supply-chain:floating-deps', 'npm ci --ignore-scripts', 'Security readiness: ok', 'package-lock.json exists']) {
    if (!lockfileRunbook.includes(token)) {
      failures.push(`${lockfileRunbookPath} missing required lockfile triage token: ${token}`);
    }
  }
}

if (!hasPackageLock) {
  failures.push('package-lock.json is missing; committed lockfile is required for reproducible CI and dependency review.');
}

if (securityCi) {
  const requiredTokens = [
    'npm ci --ignore-scripts',
    'npm run security:ci',
    'actions/setup-node@v6',
    'node-version: 22',
    'final-security-readiness.json',
  ];

  for (const token of requiredTokens) {
    if (!securityCi.includes(token)) {
      failures.push(`${securityCiWorkflowPath} missing required supply-chain token: ${token}`);
    }
  }

  if (!securityCi.includes('npm ci --ignore-scripts')) {
    failures.push(`${securityCiWorkflowPath} must use npm ci --ignore-scripts with the committed package-lock.json`);
  }

  if (securityCi.includes('npm install --ignore-scripts')) {
    failures.push(`${securityCiWorkflowPath} must not keep npm install --ignore-scripts after package-lock.json is committed`);
  }

  if (securityCi.includes('npm install') && !securityCi.includes('--ignore-scripts')) {
    failures.push(`${securityCiWorkflowPath} must use --ignore-scripts when npm install is used`);
  }

  if (!securityCi.includes('cache: npm')) {
    warnings.push(`${securityCiWorkflowPath} does not enable npm cache even though package-lock.json exists; this is allowed but slower.`);
  }
}

if (dependencyReview) {
  for (const token of [
    'actions/dependency-review-action@v5',
    'vulnerability-check: true',
    'license-check: false',
    'fail-on-severity: high',
    'comment-summary-in-pr: never',
    'npm audit --audit-level=high',
  ]) {
    if (!dependencyReview.includes(token)) {
      failures.push(`${dependencyReviewWorkflowPath} missing dependency review token: ${token}`);
    }
  }

  if (dependencyReview.includes('continue-on-error: true')) {
    failures.push(`${dependencyReviewWorkflowPath} must fail closed and must not use continue-on-error: true`);
  }

  if (dependencyReview.includes('deny-licenses')) {
    failures.push(`${dependencyReviewWorkflowPath} must not enforce broad deny-licenses here; license policy belongs in a separately triaged license gate.`);
  }
}

if (ciRequiredChecksEvidence?.status !== 'Complete') {
  failures.push(`${ciRequiredChecksEvidencePath} status must be Complete`);
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (failures.length > 0) {
  console.error('Supply-chain policy failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Supply-chain policy: ok');
}
