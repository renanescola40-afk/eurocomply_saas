import { existsSync, readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const packageLockPath = 'package-lock.json';
const npmAuditJsonPath = 'npm-audit.json';
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
