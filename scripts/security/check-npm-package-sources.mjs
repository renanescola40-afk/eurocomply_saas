import { readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const forbiddenLifecycleScripts = ['preinstall', 'install', 'postinstall', 'prepare'];
const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const failures = [];

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function isUnsafePackageSource(versionSpec) {
  const value = String(versionSpec ?? '').trim();
  return (
    value.startsWith('git+') ||
    value.startsWith('github:') ||
    value.startsWith('gitlab:') ||
    value.startsWith('bitbucket:') ||
    value.startsWith('http:') ||
    value.startsWith('https:') ||
    value.startsWith('file:') ||
    value.startsWith('link:') ||
    value.startsWith('workspace:')
  );
}

const pkg = readPackageJson();
const scripts = pkg.scripts ?? {};

for (const scriptName of forbiddenLifecycleScripts) {
  if (scripts[scriptName]) {
    failures.push(`package.json must not define lifecycle script: ${scriptName}`);
  }
}

for (const section of dependencySections) {
  const dependencies = pkg[section] ?? {};
  for (const [name, versionSpec] of Object.entries(dependencies)) {
    if (isUnsafePackageSource(versionSpec)) {
      failures.push(`package.json ${section}.${name} uses forbidden package source: ${versionSpec}`);
    }
  }
}

console.log('EuroComply npm package source policy check');
console.log('--------------------------------------------');

if (failures.length > 0) {
  console.error('npm package source policy failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('npm package source policy: ok');
}
