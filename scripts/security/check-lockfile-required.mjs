import { existsSync, readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const lockfilePath = 'package-lock.json';
const npmrcPath = '.npmrc';
const failures = [];
const warnings = [];
const enforceLockfile = process.env.EUROCOMPLY_ENTERPRISE_RELEASE === 'true';

if (!existsSync(packageJsonPath)) {
  failures.push('package.json is missing');
}

if (!existsSync(lockfilePath)) {
  const message = 'package-lock.json is missing; generate it with npm run supply-chain:lockfile and commit it';
  if (enforceLockfile) {
    failures.push(message);
  } else {
    warnings.push(`${message} before enterprise release`);
  }
}

if (existsSync(packageJsonPath)) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (pkg.packageManager !== 'npm@10.8.2') {
    failures.push('package.json must pin packageManager to npm@10.8.2');
  }
}

if (!existsSync(npmrcPath)) {
  failures.push('.npmrc is missing');
} else {
  const npmrc = readFileSync(npmrcPath, 'utf8');
  for (const token of ['package-lock=true', 'save-exact=true', 'audit=true']) {
    if (!npmrc.includes(token)) {
      failures.push(`.npmrc missing required policy: ${token}`);
    }
  }
}

console.log('EuroComply lockfile readiness check');
console.log('------------------------------------');
console.log(`Enterprise lockfile enforcement: ${enforceLockfile ? 'enabled' : 'disabled'}`);

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (failures.length > 0) {
  console.error('Lockfile readiness failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Lockfile readiness: ok');
}
