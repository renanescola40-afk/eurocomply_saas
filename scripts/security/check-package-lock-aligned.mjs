import { readFileSync } from 'node:fs';

const packagePath = 'package.json';
const lockPath = 'package-lock.json';
const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const rootPackage = lock.packages?.[''];

const failures = [];
const warnings = [];
const retiredLockOnlyDependencies = new Set(['@clerk/nextjs']);

function stable(object = {}) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

function withoutRetiredLockOnlyDependencies(object = {}, label) {
  const copy = { ...object };

  for (const dependency of retiredLockOnlyDependencies) {
    if (dependency in copy) {
      delete copy[dependency];
      warnings.push(`${label}: ignored retired lock-only dependency ${dependency}; run npm run supply-chain:lockfile to rewrite package-lock.json cleanly`);
    }
  }

  return copy;
}

function assertNoRetiredManifestDependencies(dependencies = {}, label) {
  for (const dependency of retiredLockOnlyDependencies) {
    if (dependency in dependencies) {
      failures.push(`${label}: ${dependency} must not be present in package.json; Supabase Auth is the active identity stack`);
    }
  }
}

function assertEqual(actual, expected, label) {
  const actualForCompare = withoutRetiredLockOnlyDependencies(actual ?? {}, `package-lock.json ${label}`);
  const expectedForCompare = expected ?? {};
  const actualJson = JSON.stringify(stable(actualForCompare));
  const expectedJson = JSON.stringify(stable(expectedForCompare));

  if (actualJson !== expectedJson) {
    failures.push(`${label} differ between package.json and package-lock.json`);
    const actualKeys = new Set(Object.keys(actualForCompare));
    const expectedKeys = new Set(Object.keys(expectedForCompare));
    for (const key of [...expectedKeys].filter((key) => !actualKeys.has(key)).sort()) {
      failures.push(`${label}: missing from package-lock.json root: ${key}`);
    }
    for (const key of [...actualKeys].filter((key) => !expectedKeys.has(key)).sort()) {
      failures.push(`${label}: missing from package.json: ${key}`);
    }
  }
}

if (!rootPackage) {
  failures.push('package-lock.json missing packages[""] root manifest');
} else {
  assertNoRetiredManifestDependencies(manifest.dependencies ?? {}, 'dependencies');
  assertNoRetiredManifestDependencies(manifest.devDependencies ?? {}, 'devDependencies');

  if (lock.name !== manifest.name) failures.push(`package-lock.json name (${lock.name}) must match package.json name (${manifest.name})`);
  if (rootPackage.name !== manifest.name) failures.push(`package-lock.json packages[""].name (${rootPackage.name}) must match package.json name (${manifest.name})`);
  if (lock.version !== manifest.version) failures.push(`package-lock.json version (${lock.version}) must match package.json version (${manifest.version})`);
  if (rootPackage.version !== manifest.version) failures.push(`package-lock.json packages[""].version (${rootPackage.version}) must match package.json version (${manifest.version})`);

  assertEqual(rootPackage.dependencies ?? {}, manifest.dependencies ?? {}, 'dependencies');
  assertEqual(rootPackage.devDependencies ?? {}, manifest.devDependencies ?? {}, 'devDependencies');
}

console.log('RISCK COMPLY package-lock alignment check');
console.log('-------------------------------------------');
for (const warning of warnings) console.warn(`warning: ${warning}`);

if (failures.length > 0) {
  console.error('package-lock alignment failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('package.json and package-lock.json are aligned for active dependencies.');
}
