import { readFileSync } from 'node:fs';

const packageJsonPath = 'package.json';

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
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
    .map(([name, versionSpec]) => ({
      sectionName,
      name,
      versionSpec,
    }));
}

const pkg = readPackageJson();
const floatingDependencies = [
  ...collectFloatingDependencies('dependencies', pkg.dependencies ?? {}),
  ...collectFloatingDependencies('devDependencies', pkg.devDependencies ?? {}),
];

console.log('EuroComply floating dependency policy check');
console.log('-------------------------------------------');

if (floatingDependencies.length === 0) {
  console.log('No floating dependency specs found.');
  process.exit(0);
}

console.error(`Found ${floatingDependencies.length} forbidden floating dependency spec(s):`);
console.error('');

for (const dependency of floatingDependencies) {
  console.error(`- ${dependency.sectionName}.${dependency.name}: ${dependency.versionSpec}`);
}

console.error('');
console.error('Floating dependency specs are forbidden for production readiness.');
console.error('Replace each value with an exact audited version, regenerate package-lock.json, and re-run the security suite.');
process.exitCode = 1;
