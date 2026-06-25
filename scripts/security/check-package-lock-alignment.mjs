import { existsSync, readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const packageLockPath = 'package-lock.json';
const failures = [];

function readJson(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    failures.push(`${path} is not valid JSON: ${error.message}`);
    return null;
  }
}

function sortedEntries(object = {}) {
  return Object.entries(object).sort(([left], [right]) => left.localeCompare(right));
}

function compareDependencySection(sectionName, packageDeps = {}, lockDeps = {}) {
  const packageNames = new Set(Object.keys(packageDeps));
  const lockNames = new Set(Object.keys(lockDeps));

  for (const [name, wanted] of sortedEntries(packageDeps)) {
    if (!lockNames.has(name)) {
      failures.push(`${packageLockPath} root ${sectionName} is missing ${name}@${wanted}`);
      continue;
    }

    if (lockDeps[name] !== wanted) {
      failures.push(`${packageLockPath} root ${sectionName}.${name} is ${lockDeps[name]}, expected ${wanted}`);
    }
  }

  for (const [name, locked] of sortedEntries(lockDeps)) {
    if (!packageNames.has(name)) {
      failures.push(`${packageLockPath} root ${sectionName} has extra dependency ${name}@${locked}`);
    }
  }
}

const pkg = readJson(packageJsonPath);
const lock = readJson(packageLockPath);
const rootPackage = lock?.packages?.[''];

console.log('RISCK COMPLY package-lock alignment check');
console.log('-------------------------------------------');

if (lock && lock.lockfileVersion !== 3) {
  failures.push(`${packageLockPath} lockfileVersion must be 3`);
}

if (pkg && lock) {
  if (lock.name !== pkg.name) {
    failures.push(`${packageLockPath} name is ${lock.name}, expected ${pkg.name}`);
  }

  if (lock.version !== pkg.version) {
    failures.push(`${packageLockPath} version is ${lock.version}, expected ${pkg.version}`);
  }
}

if (pkg && rootPackage) {
  if (rootPackage.name !== pkg.name) {
    failures.push(`${packageLockPath} packages[""].name is ${rootPackage.name}, expected ${pkg.name}`);
  }

  if (rootPackage.version !== pkg.version) {
    failures.push(`${packageLockPath} packages[""].version is ${rootPackage.version}, expected ${pkg.version}`);
  }

  compareDependencySection('dependencies', pkg.dependencies ?? {}, rootPackage.dependencies ?? {});
  compareDependencySection('devDependencies', pkg.devDependencies ?? {}, rootPackage.devDependencies ?? {});
} else if (lock && !rootPackage) {
  failures.push(`${packageLockPath} packages[""] root package metadata is missing`);
}

if (failures.length > 0) {
  console.error('package-lock alignment failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Regenerate the lockfile with: npm install --package-lock-only --ignore-scripts');
  process.exitCode = 1;
} else {
  console.log('package-lock.json is aligned with package.json');
}
