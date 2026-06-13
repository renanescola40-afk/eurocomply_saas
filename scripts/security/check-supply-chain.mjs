import { existsSync, readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const npmrcPath = '.npmrc';
const supplyChainDocPath = 'docs/security/SUPPLY_CHAIN.md';
const securityCiWorkflowPath = '.github/workflows/security-ci.yml';
const dependencyReviewWorkflowPath = '.github/workflows/dependency-review.yml';

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

const pkg = readJson(packageJsonPath);
const npmrc = read(npmrcPath);
const supplyChainDoc = read(supplyChainDocPath);
const securityCi = read(securityCiWorkflowPath);
const dependencyReview = read(dependencyReviewWorkflowPath);

console.log('EuroComply supply-chain policy check');
console.log('------------------------------------');

if (pkg) {
  if (pkg.packageManager !== 'npm@10.8.2') {
    failures.push(`${packageJsonPath} must pin packageManager to npm@10.8.2`);
  }

  const scripts = pkg.scripts ?? {};
  for (const scriptName of ['preinstall', 'install', 'postinstall', 'prepare']) {
    if (scripts[scriptName]) {
      failures.push(`${packageJsonPath} must not define lifecycle script: ${scriptName}`);
    }
  }

  for (const scriptName of [
    'security:npm-audit:prod',
    'security:npm-audit:json',
    'security:npm-audit:summary',
  ]) {
    if (!scripts[scriptName]) {
      failures.push(`${packageJsonPath} missing required npm audit script: ${scriptName}`);
    }
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
  for (const token of ['Dependency Review', 'CodeQL', 'npm install --ignore-scripts', 'package-lock.json', 'npm ci --ignore-scripts', 'floating version']) {
    if (!supplyChainDoc.includes(token)) {
      failures.push(`${supplyChainDocPath} missing required supply-chain evidence token: ${token}`);
    }
  }
}

if (!existsSync('package-lock.json')) {
  warnings.push('package-lock.json is missing; npm install --ignore-scripts is used temporarily. Commit a lockfile and switch CI back to npm ci --ignore-scripts for stronger reproducibility.');
}

if (securityCi) {
  const requiredTokens = [
    'npm install --ignore-scripts',
    'npm run security:ci',
    'actions/setup-node@v4',
    'node-version: 22',
  ];

  for (const token of requiredTokens) {
    if (!securityCi.includes(token)) {
      failures.push(`${securityCiWorkflowPath} missing required supply-chain token: ${token}`);
    }
  }

  if (securityCi.includes('npm install') && !securityCi.includes('--ignore-scripts')) {
    failures.push(`${securityCiWorkflowPath} must use --ignore-scripts when npm install is used`);
  }
}

if (dependencyReview) {
  for (const token of ['actions/dependency-review-action@v4', 'fail-on-severity: high', 'deny-licenses']) {
    if (!dependencyReview.includes(token)) {
      failures.push(`${dependencyReviewWorkflowPath} missing dependency review token: ${token}`);
    }
  }
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (failures.length > 0) {
  console.error('Supply-chain policy failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Supply-chain policy: ok');
}
