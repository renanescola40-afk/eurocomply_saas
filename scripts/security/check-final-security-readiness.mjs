import { existsSync, readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const packageLockPath = 'package-lock.json';
const npmAuditJsonPath = 'npm-audit.json';
const securityCiWorkflowPath = '.github/workflows/security-ci.yml';
const expectedPackageManager = 'npm@10.8.2';

const blockers = [];
const notes = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    blockers.push(`${path} could not be read as JSON: ${error.message}`);
    return null;
  }
}

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    blockers.push(`${path} could not be read: ${error.message}`);
    return '';
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

function collectFloatingDependencies(sectionName, dependencies = {}) {
  return Object.entries(dependencies)
    .filter(([, versionSpec]) => isFloatingDependencySpec(versionSpec))
    .map(([name, versionSpec]) => `${sectionName}.${name}: ${versionSpec}`);
}

function checkPackageJson() {
  const pkg = readJson(packageJsonPath);
  if (!pkg) return;

  if (pkg.packageManager !== expectedPackageManager) {
    blockers.push(`${packageJsonPath} must pin packageManager to ${expectedPackageManager}`);
  }

  const floatingDependencies = [
    ...collectFloatingDependencies('dependencies', pkg.dependencies ?? {}),
    ...collectFloatingDependencies('devDependencies', pkg.devDependencies ?? {}),
  ];

  if (floatingDependencies.length > 0) {
    blockers.push(
      `Replace floating dependency specs with exact audited versions:\n${floatingDependencies
        .map((dependency) => `  - ${dependency}`)
        .join('\n')}`,
    );
  }
}

function checkLockfile() {
  if (!existsSync(packageLockPath)) {
    blockers.push(`${packageLockPath} is missing; run npm run supply-chain:lockfile with npm 10.8.2 and commit the reviewed lockfile.`);
  }
}

function checkSecurityCiCachePolicy() {
  if (!existsSync(securityCiWorkflowPath)) {
    blockers.push(`${securityCiWorkflowPath} is missing`);
    return;
  }

  const securityCi = readText(securityCiWorkflowPath);
  const hasLockfile = existsSync(packageLockPath);

  if (!hasLockfile && securityCi.includes('cache: npm')) {
    blockers.push(`${securityCiWorkflowPath} must not enable npm cache until ${packageLockPath} exists.`);
    return;
  }

  if (!hasLockfile) {
    notes.push('Security CI npm cache is disabled while package-lock.json is missing. This is expected until lockfile triage is complete.');
  }

  if (hasLockfile && securityCi.includes('npm install --ignore-scripts')) {
    blockers.push(`${securityCiWorkflowPath} should switch from npm install --ignore-scripts to npm ci --ignore-scripts after package-lock.json is committed.`);
  }
}

function checkNpmAuditJson() {
  if (!existsSync(npmAuditJsonPath)) {
    blockers.push(`${npmAuditJsonPath} is missing; run npm run security:npm-audit:json > npm-audit.json or download the npm-audit-triage artifact.`);
    return;
  }

  const audit = readJson(npmAuditJsonPath);
  if (!audit) return;

  const vulnerabilities = audit.vulnerabilities ?? {};
  const vulnerablePackages = Object.entries(vulnerabilities).filter(([, vulnerability]) => vulnerability?.isDirect || vulnerability?.via?.length > 0);

  if (vulnerablePackages.length > 0) {
    blockers.push(
      `npm audit still reports ${vulnerablePackages.length} vulnerable package(s); run npm run security:npm-audit:summary and apply targeted fixes before release readiness.`,
    );
  } else {
    notes.push('npm-audit.json has no vulnerable packages listed.');
  }
}

console.log('EuroComply final security readiness check');
console.log('-----------------------------------------');

checkPackageJson();
checkLockfile();
checkSecurityCiCachePolicy();
checkNpmAuditJson();

if (notes.length > 0) {
  for (const note of notes) console.log(`Note: ${note}`);
}

if (blockers.length > 0) {
  console.error('Release/security readiness blockers:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exitCode = 1;
} else {
  console.log('Security readiness: ok');
}
