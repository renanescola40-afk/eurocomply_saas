import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const lockfilePath = 'package-lock.json';
const changeReportPath = 'dependency-pin-change-report.json';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isFloating(versionSpec) {
  const value = String(versionSpec ?? '').trim();
  return (
    value === 'latest' ||
    value === '*' ||
    value.startsWith('>=') ||
    value.includes(' || ') ||
    /^\d+\.x(?:\.x)?$/i.test(value) ||
    /^x(?:\.x){0,2}$/i.test(value)
  );
}

function resolvedVersionFromLockfile(lockfile, packageName) {
  const packageEntry = lockfile.packages?.[`node_modules/${packageName}`];
  if (packageEntry?.version) return packageEntry.version;

  const dependencyEntry = lockfile.dependencies?.[packageName];
  if (dependencyEntry?.version) return dependencyEntry.version;

  return null;
}

if (!existsSync(packageJsonPath)) {
  console.error('package.json is missing.');
  process.exit(1);
}

if (!existsSync(lockfilePath)) {
  console.error('package-lock.json is missing. Generate it first with: npm run supply-chain:lockfile');
  process.exit(1);
}

const pkg = readJson(packageJsonPath);
const lockfile = readJson(lockfilePath);
const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const changes = [];
const unresolved = [];

for (const section of sections) {
  const dependencies = pkg[section] ?? {};
  for (const [name, versionSpec] of Object.entries(dependencies)) {
    if (!isFloating(versionSpec)) continue;

    const resolvedVersion = resolvedVersionFromLockfile(lockfile, name);
    if (!resolvedVersion) {
      unresolved.push({ section, name, current: versionSpec });
      continue;
    }

    dependencies[name] = resolvedVersion;
    changes.push({ section, name, from: versionSpec, to: resolvedVersion });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  lockfile: lockfilePath,
  changed: changes,
  unresolved,
};

writeFileSync(changeReportPath, `${JSON.stringify(report, null, 2)}\n`);

if (unresolved.length > 0) {
  console.error('Cannot safely apply all pins. Some floating specs were not resolved from package-lock.json:');
  for (const item of unresolved) console.error(`- ${item.section}.${item.name}: ${item.current}`);
  console.error(`Report: ${changeReportPath}`);
  process.exit(1);
}

if (changes.length === 0) {
  console.log('No floating dependency specs found. package.json unchanged.');
  process.exit(0);
}

writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log('EuroComply dependency pin applicator');
console.log('--------------------------------------');
console.log(`Applied pins: ${changes.length}`);
console.log(`Report: ${changeReportPath}`);
for (const change of changes) {
  console.log(`PIN ${change.section}.${change.name}: ${change.from} -> ${change.to}`);
}
