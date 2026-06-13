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

console.log('EuroComply floating dependency triage');
console.log('--------------------------------------');

if (floatingDependencies.length === 0) {
  console.log('No floating dependency specs found.');
  process.exit(0);
}

console.log(`Found ${floatingDependencies.length} floating dependency spec(s):`);
console.log('');

for (const dependency of floatingDependencies) {
  console.log(`- ${dependency.sectionName}.${dependency.name}: ${dependency.versionSpec}`);
}

console.log('');
console.log('Recommended next steps:');
console.log('1. Generate package-lock.json with npm run supply-chain:lockfile.');
console.log('2. Run npm audit triage and review the lockfile-resolved versions.');
console.log('3. Replace each floating spec with the exact audited version resolved in package-lock.json.');
console.log('4. Re-run npm run security:ci before committing dependency changes.');
