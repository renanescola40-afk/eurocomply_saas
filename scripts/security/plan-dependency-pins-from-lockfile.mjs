import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const packageJsonPath = 'package.json';
const lockfilePath = 'package-lock.json';
const reportPath = 'dependency-pin-plan.json';

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
const plannedPins = [];
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

    plannedPins.push({
      section,
      name,
      current: versionSpec,
      recommended: resolvedVersion,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  lockfile: lockfilePath,
  plannedPins,
  unresolved,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('EuroComply dependency pin plan');
console.log('--------------------------------');
console.log(`Planned pins: ${plannedPins.length}`);
console.log(`Unresolved floating specs: ${unresolved.length}`);
console.log(`Report: ${reportPath}`);

for (const pin of plannedPins) {
  console.log(`PIN ${pin.section}.${pin.name}: ${pin.current} -> ${pin.recommended}`);
}

if (unresolved.length > 0) {
  console.error('Some floating dependency specs could not be resolved from package-lock.json:');
  for (const item of unresolved) {
    console.error(`- ${item.section}.${item.name}: ${item.current}`);
  }
  process.exitCode = 1;
}
