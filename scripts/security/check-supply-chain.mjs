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
}

if (npmrc) {
  for (const token of ['package-lock=true', 'audit=true', 'fund=false', 'save-exact=true']) {
    if (!npmrc.includes(token)) {
      failures.push(`${npmrcPath} missing required npm policy: ${token}`);
    }
  }
}

if (supplyChainDoc) {
  for (const token of ['Dependency Review', 'CodeQL', 'npm install --ignore-scripts', 'package-lock.json', 'npm ci --ignore-scripts']) {
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
